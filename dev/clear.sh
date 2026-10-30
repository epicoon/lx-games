#!/usr/bin/env bash
# Full revert of whatever the last deploy.sh run actually did, read back
# from dev/deploy_report (not re-derived from dev/defaults.yaml, which may
# have changed since - see dev/README.md). Tears down containers, volumes
# and locally-built images for every service that was deployed, and
# deletes the local env/config files deploy.sh generated for them. Leaves
# alone: dev/defaults.yaml (yours, never generated), and a cloned ../lxgo
# checkout (kept on disk on purpose, so the next deploy.sh doesn't have to
# clone it again - see dev/README.md).
set -euo pipefail

DEV_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$DEV_DIR")"
REPORT_FILE="$DEV_DIR/deploy_report"

if [ ! -f "$REPORT_FILE" ]; then
  echo "Nothing to clear - no $REPORT_FILE (deploy.sh never ran, or clear.sh already ran since)."
  exit 0
fi

# shellcheck disable=SC1090
eval "$(cd "$DEV_DIR/configtool" && GOWORK=off go run . "$REPORT_FILE")"

: "${LXGO_AUTH_DIR:=}"
: "${DEPLOYED_AUTH:=false}"
: "${DEPLOYED_LOBBY:=false}"
: "${DEPLOYED_CARTRIDGE:=false}"
: "${CREATED_AUTH_ENV:=}"
: "${CREATED_AUTH_CONFIG_LOCAL:=}"
: "${CREATED_LOBBY_ENV:=}"
: "${CREATED_LOBBY_CONFIG_LOCAL:=}"
: "${CREATED_CARTRIDGE_ENV:=}"

tear_down() { # tear_down COMPOSE_DIR LABEL
  local compose_dir="$1" label="$2"
  if [ ! -f "$compose_dir/docker-compose.yml" ] && [ ! -f "$compose_dir/../docker-compose.yml" ]; then
    echo "== ${label}: nothing to tear down (no docker-compose.yml at $compose_dir) =="
    return
  fi
  echo "== ${label} =="
  (cd "$compose_dir" && docker compose down -v --rmi local)
}

remove_generated() { # remove_generated PATH...
  for f in "$@"; do
    if [ -n "$f" ] && [ -f "$f" ]; then
      rm -f "$f"
      echo "Removed $f"
    fi
  done
}

if [ "$DEPLOYED_AUTH" = "true" ] && [ -n "$LXGO_AUTH_DIR" ]; then
  tear_down "$LXGO_AUTH_DIR/runtime" "lxgo-auth"
  remove_generated "$CREATED_AUTH_ENV" "$CREATED_AUTH_CONFIG_LOCAL"
fi

if [ "$DEPLOYED_LOBBY" = "true" ]; then
  tear_down "$REPO_ROOT/lx-games-lobby/runtime" "lx-games-lobby"
  remove_generated "$CREATED_LOBBY_ENV" "$CREATED_LOBBY_CONFIG_LOCAL"
fi

if [ "$DEPLOYED_CARTRIDGE" = "true" ]; then
  tear_down "$REPO_ROOT/lx-games-cartridge/runtime" "lx-games-cartridge"
  remove_generated "$CREATED_CARTRIDGE_ENV"
fi

rm -f "$REPORT_FILE"
echo
echo "Done - a cloned ../lxgo (if deploy.sh made one) and dev/defaults.yaml were left in place."
