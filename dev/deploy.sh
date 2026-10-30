#!/usr/bin/env bash
# One command to stand up the whole lx-games dev stack: lxgo-auth (Docker),
# lx-games-lobby (Docker, wired to lxgo-auth for real login/signup), and
# lx-games-cartridge (Docker, announced to the lobby). Safe to re-run -
# anything already set up (generated env/config files, a running
# container, a registered OAuth client) is left alone, not redone.
#
# See dev/README.md for the full picture, dev/defaults.yaml.example for
# every override this script understands (ports, which services to skip,
# an existing lxgo-auth checkout to reuse instead of cloning one).
set -euo pipefail

DEV_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$DEV_DIR")"
REPORT_FILE="$DEV_DIR/deploy_report"

# Load, in order: what we already know happened (deploy_report - e.g. an
# OAuth client registered on a previous run, possibly one that deployed
# auth without the lobby), then what's wanted now (defaults.yaml). Neither
# file existing yet is fine - both print nothing then.
# shellcheck disable=SC1090
eval "$(cd "$DEV_DIR/configtool" && GOWORK=off go run . "$REPORT_FILE")"
# shellcheck disable=SC1090
eval "$(cd "$DEV_DIR/configtool" && GOWORK=off go run . "$DEV_DIR/defaults.yaml")"

: "${PATHS_LXGO_AUTH:=}"
: "${PORTS_LOBBYAPP:=8100}"
: "${PORTS_CARTRIDGEAPP:=8110}"
: "${PORTS_AUTHAPP:=8120}"
: "${PORTS_AUTHDB:=8121}"
: "${IGNORE_AUTH:=false}"
: "${IGNORE_LOBBY:=false}"
: "${IGNORE_CARTRIDGE:=false}"
: "${AUTHAPP_SECRET:=}"
: "${AUTH_CLIENT_ID:=}"
: "${AUTH_CLIENT_SECRET:=}"

report() { # report KEY VALUE - record one fact for clear.sh to read back later
  local key="$1" value="$2"
  touch "$REPORT_FILE"
  if grep -q "^${key}:" "$REPORT_FILE" 2>/dev/null; then
    sed -i "s|^${key}:.*|${key}: ${value}|" "$REPORT_FILE"
  else
    echo "${key}: ${value}" >> "$REPORT_FILE"
  fi
}

random_password() {
  LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24
}

wait_for_postgres() {
  local compose_dir="$1" user="$2" db="$3"
  for _ in $(seq 1 30); do
    if (cd "$compose_dir" && docker compose exec -T db pg_isready -U "$user" -d "$db" >/dev/null 2>&1); then
      return 0
    fi
    sleep 1
  done
  echo "deploy.sh: database in $compose_dir never became ready" >&2
  return 1
}

# network_gateway SERVICE_DIR - the host-reachable gateway IP of that
# service's own docker-compose network (named "<basename of SERVICE_DIR>_
# default" - Compose's own default naming, unrelated to which directory
# the command was actually invoked from). This IP is bound on the host
# itself, so it's reachable both from any OTHER container (the way plain
# "localhost" can't be, since that always means "this container") and
# from the host/browser directly - no docker-compose.yml changes needed
# to cross this boundary. Empty if that service's network doesn't exist
# yet (first deploy, before its own first `docker compose up`).
network_gateway() {
  docker network inspect "$(basename "$1")_default" \
    --format '{{(index .IPAM.Config 0).Gateway}}' 2>/dev/null
}

LOBBY_DIR="$REPO_ROOT/lx-games-lobby"
CARTRIDGE_DIR="$REPO_ROOT/lx-games-cartridge"
LOBBY_CONFIG_LOCAL="$LOBBY_DIR/runtime/config-local.yaml"
# AUTH_CLIENT_ID/AUTH_CLIENT_SECRET: already set above (from deploy_report)
# if a client was registered on a previous run - deploy_auth only
# registers a new one when these are still empty.

deploy_auth() {
  if [ "$IGNORE_AUTH" = "true" ]; then
    echo "== lxgo-auth: skipped (Ignore.Auth) =="
    return
  fi
  echo "== lxgo-auth =="

  local lxgo_auth_dir
  if [ -n "$PATHS_LXGO_AUTH" ]; then
    lxgo_auth_dir="$PATHS_LXGO_AUTH"
  else
    local lxgo_parent clone_dir
    lxgo_parent="$(dirname "$REPO_ROOT")"
    clone_dir="$lxgo_parent/lxgo"
    if [ ! -d "$clone_dir" ]; then
      echo "Cloning lxgo..."
      git clone git@github.com:epicoon/lxgo.git "$clone_dir"
      report CLONED_LXGO true
    fi
    lxgo_auth_dir="$clone_dir/auth"
  fi
  report LXGO_AUTH_DIR "$lxgo_auth_dir"

  local runtime_dir="$lxgo_auth_dir/runtime"
  if [ ! -f "$runtime_dir/.env" ]; then
    cat > "$runtime_dir/.env" <<EOF
APP_HOST=localhost
APP_PORT=8000
APP_PORT_EXTERNAL=${PORTS_AUTHAPP}

DB_HOST=db
DB_PORT=5432
DB_PORT_EXTERNAL=${PORTS_AUTHDB}
DB_USER=lxgo_auth
DB_NAME=lxgo_auth
DB_PASS=$(random_password)
EOF
    report CREATED_AUTH_ENV "$runtime_dir/.env"
  fi

  if [ ! -f "$runtime_dir/config-local.yaml" ]; then
    cat > "$runtime_dir/config-local.yaml" <<EOF
Host: localhost

Settings:
  AdminPanel: "enable"

Components:
  SessionStorage:
    MaxLifeTime: 36000
  Cors:
    Origins:
      "http://localhost:${PORTS_LOBBYAPP}": {}
EOF
    report CREATED_AUTH_CONFIG_LOCAL "$runtime_dir/config-local.yaml"
  fi

  (cd "$runtime_dir" && docker compose up -d db)
  wait_for_postgres "$runtime_dir" lxgo_auth lxgo_auth
  (cd "$runtime_dir" && docker compose run --rm app migrator:up)
  (cd "$runtime_dir" && docker compose up -d --build app)
  report DEPLOYED_AUTH true

  # One client always exists per auth deployment, whether or not the
  # lobby is the one being deployed right now (Ignore.Lobby doesn't enter
  # into it) - guarded purely by "do we already have one", read from
  # dev/deploy_report at the top of this script, so a later run that
  # deploys the lobby for the first time (auth already up from before,
  # possibly deployed with Ignore.Lobby itself) reuses it instead of
  # minting a second one.
  if [ -z "$AUTH_CLIENT_ID" ]; then
    echo "Registering an OAuth client for the lobby..."
    local client_out secret_flag=()
    [ -n "$AUTHAPP_SECRET" ] && secret_flag=(--secret="$AUTHAPP_SECRET")
    client_out=$(cd "$runtime_dir" && docker compose exec -T app /app/bin client:new --email-policy="optional"\
      --google-enabled="true" --redirect-uri="http://localhost:${PORTS_LOBBYAPP}/auth-callback" "${secret_flag[@]}")
    AUTH_CLIENT_ID=$(echo "$client_out" | sed -n -E 's/.*ID:[[:space:]]*([0-9]+).*/\1/p')
    AUTH_CLIENT_SECRET=$(echo "$client_out" | sed -n -E 's/.*Secret:[[:space:]]*([^[:space:]]+).*/\1/p')
    if [ -z "$AUTH_CLIENT_ID" ] || [ -z "$AUTH_CLIENT_SECRET" ]; then
      echo "deploy.sh: could not parse 'client:new' output: $client_out" >&2
      exit 1
    fi
    report AUTH_CLIENT_ID "$AUTH_CLIENT_ID"
    report AUTH_CLIENT_SECRET "$AUTH_CLIENT_SECRET"
  fi
}

deploy_lobby() {
  if [ "$IGNORE_LOBBY" = "true" ]; then
    echo "== lx-games-lobby: skipped (Ignore.Lobby) =="
    return
  fi
  echo "== lx-games-lobby =="

  local runtime_dir="$LOBBY_DIR/runtime"
  if [ ! -f "$runtime_dir/.env" ]; then
    cat > "$runtime_dir/.env" <<EOF
APP_HOST=localhost
APP_PORT=8000
APP_PORT_EXTERNAL=${PORTS_LOBBYAPP}
EOF
    report CREATED_LOBBY_ENV "$runtime_dir/.env"
  fi

  if [ ! -f "$LOBBY_CONFIG_LOCAL" ]; then
    local cartridges_block=""
    if [ "$IGNORE_CARTRIDGE" != "true" ]; then
      cartridges_block="Cartridges:
  - localhost:${PORTS_CARTRIDGEAPP}
"
    fi
    local auth_block=""
    if [ -n "$AUTH_CLIENT_ID" ]; then
      auth_block="  Auth:
    ID: ${AUTH_CLIENT_ID}
    Secret: ${AUTH_CLIENT_SECRET}
    RedirectUri: http://localhost:${PORTS_LOBBYAPP}/auth-callback
    Server: http://localhost:${PORTS_AUTHAPP}
"
    fi
    cat > "$LOBBY_CONFIG_LOCAL" <<EOF
${cartridges_block}
Components:
  WSServer:
    MaxRequestsPerMinute: 10
    MaxConnectionsPerIp: 5
    ReconnectionAllowed: false
    ReconnectionDuration: 5000
    LifecycleLog: true
    LifecycleError: true
  JSPreprocessor:
    Mode: DEV
    PluginCacheType: off
${auth_block}
EOF
    report CREATED_LOBBY_CONFIG_LOCAL "$LOBBY_CONFIG_LOCAL"
  fi

  (cd "$LOBBY_DIR" && ./build.sh)
  (cd "$runtime_dir" && docker compose up -d --build app)

  # Components.Auth.Server (both the lobby's own Go backend - token
  # exchange, get-user-data - AND, via lx-app.yaml's @config(...), the
  # browser's direct /remote/login,/remote/signup calls - read it). A
  # plain "localhost" only reaches lxgo-auth from the browser (which runs
  # on the host) - the lobby's own backend runs inside this container,
  # where "localhost" means this container. The compose network's own
  # gateway IP is bound on the host itself, so it resolves correctly from
  # both places without touching docker-compose.yml - but it only exists
  # once this container's first `up` above has created the network.
  local gateway needs_restart=false
  gateway="$(network_gateway "$LOBBY_DIR")"
  if [ -n "$gateway" ] && ! grep -q "Server: http://${gateway}:" "$LOBBY_CONFIG_LOCAL"; then
    sed -i -E "s|^(    Server: http://)[^:]+(:.*)|\1${gateway}\2|" "$LOBBY_CONFIG_LOCAL"
    needs_restart=true
  fi
  # Cartridges: is the allowlist the lobby checks a cartridge's announced
  # address against (see lx-games-lobby's README/handlers.cartridge_announce)
  # - has to name the exact same gateway-IP address deploy_cartridge gives
  # that cartridge as its own CARTRIDGE_ADVERTISE_ADDR, or the announce is
  # rejected (403) even though the request itself reaches the lobby fine.
  if [ -n "$gateway" ] && [ "$IGNORE_CARTRIDGE" != "true" ] \
     && ! grep -q "^  - ${gateway}:" "$LOBBY_CONFIG_LOCAL"; then
    sed -i -E "s|^(  - )[^:]+(:.*)|\1${gateway}\2|" "$LOBBY_CONFIG_LOCAL"
    needs_restart=true
  fi
  if [ "$needs_restart" = true ]; then
    (cd "$runtime_dir" && docker compose restart app)
  fi
  report DEPLOYED_LOBBY true
}

deploy_cartridge() {
  if [ "$IGNORE_CARTRIDGE" = "true" ]; then
    echo "== lx-games-cartridge: skipped (Ignore.Cartridge) =="
    return
  fi
  echo "== lx-games-cartridge =="

  # The lobby's own network already exists by now (deploy_lobby runs
  # first) - its gateway is what the lobby will actually use to dial this
  # cartridge back, see the comment on network_gateway().
  local lobby_gateway
  lobby_gateway="$(network_gateway "$LOBBY_DIR")"

  local runtime_dir="$CARTRIDGE_DIR/runtime"
  if [ ! -f "$runtime_dir/.env" ]; then
    cat > "$runtime_dir/.env" <<EOF
APP_HOST=localhost
APP_PORT=8092
APP_PORT_EXTERNAL=${PORTS_CARTRIDGEAPP}

STATIC_SRC=http://localhost:${PORTS_CARTRIDGEAPP}
LOBBY_URL=http://localhost:${PORTS_LOBBYAPP}
CARTRIDGE_ADVERTISE_ADDR=${lobby_gateway:-localhost}:${PORTS_CARTRIDGEAPP}
EOF
    report CREATED_CARTRIDGE_ENV "$runtime_dir/.env"
  fi

  (cd "$runtime_dir" && docker compose up -d --build app)

  # LOBBY_URL (this cartridge calling OUT to announce itself) needs this
  # cartridge's OWN network's gateway to reach the lobby's host-published
  # port - same reasoning as deploy_lobby's Server fix, mirrored the other
  # direction; only exists once the `up` above has created the network.
  local needs_restart=false
  local cart_gateway
  cart_gateway="$(network_gateway "$CARTRIDGE_DIR")"
  if [ -n "$cart_gateway" ] && ! grep -q "^LOBBY_URL=http://${cart_gateway}:" "$runtime_dir/.env"; then
    sed -i -E "s|^(LOBBY_URL=http://)[^:]+(:.*)|\1${cart_gateway}\2|" "$runtime_dir/.env"
    needs_restart=true
  fi
  if [ -n "$lobby_gateway" ] && ! grep -q "^CARTRIDGE_ADVERTISE_ADDR=${lobby_gateway}:" "$runtime_dir/.env"; then
    sed -i -E "s|^(CARTRIDGE_ADVERTISE_ADDR=)[^:]+(:.*)|\1${lobby_gateway}\2|" "$runtime_dir/.env"
    needs_restart=true
  fi
  if [ "$needs_restart" = true ]; then
    (cd "$runtime_dir" && docker compose restart app)
  fi
  report DEPLOYED_CARTRIDGE true
}

deploy_auth
deploy_lobby
deploy_cartridge

echo
echo "Done."
[ "$IGNORE_AUTH" = "true" ]      || echo "  lxgo-auth:          http://localhost:${PORTS_AUTHAPP}"
[ "$IGNORE_LOBBY" = "true" ]     || echo "  lx-games-lobby:     http://localhost:${PORTS_LOBBYAPP}"
[ "$IGNORE_CARTRIDGE" = "true" ] || echo "  lx-games-cartridge: http://localhost:${PORTS_CARTRIDGEAPP}"
