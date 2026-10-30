# dev/ - one-command local dev stack

```
./deploy.sh
```

Stands up the whole stack this repo needs for online play, in order:

1. **lxgo-auth** - clones [lxgo](https://github.com/epicoon/lxgo) as `../lxgo` (a sibling of this repo) if it isn't
   already there, or reuses whatever `defaults.yaml`'s `Paths.lxgo-auth` points at (see below); generates its
   `runtime/.env`/`runtime/config-local.yaml` if they don't exist yet (random DB password, CORS opened for the
   lobby's own port); brings it up via its own Docker Compose setup, migrates the database, and registers an
   OAuth client for the lobby.
2. **lx-games-lobby** - generates `runtime/.env`/`runtime/config-local.yaml` if absent (the registered client's
   `ID`/`Secret`, the cartridge in `Cartridges:`, lxgo-auth's address); builds and brings it up via Docker.
3. **lx-games-cartridge** - generates `runtime/.env` if absent (wired to announce itself to the lobby); builds and
   brings it up via Docker.

Safe to re-run at any point - anything already generated or already running is left alone, not redone or
restarted, except for the one thing that does need to adapt on every run (see "Container-to-container
addressing" below).

```
./clear.sh
```

Tears down everything the last `deploy.sh` run actually did - every container, volume and locally-built image it
started, and every `.env`/`config-local.yaml` it generated - read back from `dev/deploy_report` (not re-derived
from `defaults.yaml`, which may have changed since the deploy). Leaves two things in place on purpose: a cloned
`../lxgo` checkout (so the next `deploy.sh` doesn't have to clone it again), and `defaults.yaml` itself (it's
yours, `deploy.sh` never writes to it). If `deploy.sh` never ran (no `dev/deploy_report`), `clear.sh` just says so
and exits.

## defaults.yaml

Copy `defaults.yaml.example` to `defaults.yaml` (gitignored) to override anything below - every key is optional,
missing ones (or a missing file entirely) fall back to `deploy.sh`'s own built-in defaults:

```yaml
Paths:
  lxgo-auth: /path/to/lxgo-auth   # an existing checkout with its own Dockerfile/docker-compose.yml/docker-setup.sh -
                                   # skips cloning ../lxgo entirely if set

Ports:
  LobbyApp: 8100
  CartridgeApp: 8110
  AuthApp: 8120
  AuthDb: 8121

Ignore:
  Auth: false       # skip deploying/clearing that service entirely
  Lobby: false
  Cartridge: false

AuthApp:
  Secret: ""        # passed as client:new's --secret instead of a random one; only
                     # read the first time the lobby's OAuth client gets registered
```

## Container-to-container addressing

lxgo-auth, the lobby and the cartridge each run in their own Docker Compose project, with no shared network
between them - and inside any one of them, `localhost` means that container itself, not the host or any sibling
container. Three things need to cross that boundary: the lobby's own backend calling lxgo-auth directly
(token exchange, fetching user data), the cartridge announcing itself to the lobby
(`POST /cartridge/announce`), and the lobby dialing the cartridge back over WebSocket.

`deploy.sh` resolves this without touching any `docker-compose.yml`: each Compose project's own default network
has a gateway IP that's bound on the host itself, so it's reachable both from sibling containers and from the
host (including a browser running on it) - unlike `localhost`. The catch is that a service's own network only
exists once its container has started at least once, so `deploy.sh` brings each one up first, then looks up its
gateway IP (`docker network inspect <project>_default`), corrects `Components.Auth.Server` /
`Cartridges:` / `LOBBY_URL` / `CARTRIDGE_ADVERTISE_ADDR` to use it instead of `localhost`, and restarts the
container if anything actually changed. This is also why a re-run isn't entirely a no-op even when nothing in
`defaults.yaml` changed: if a network got recreated (for instance after `clear.sh`) with a different gateway IP,
`deploy.sh` notices on the next run and fixes these values again.

## configtool/

A small standalone Go program (own `go.mod`, deliberately outside this workspace's `go.work`) that `deploy.sh`/
`clear.sh` shell out to for reading `defaults.yaml`/`deploy_report` - bash has nothing built in for YAML, and
Go+`yaml.v3` is already this project's native tool for exactly this job everywhere else. `go run . <path>` prints
the given YAML file's contents as `export KEY=value` shell lines (nested keys flatten by joining with `_`); a
missing file prints nothing and exits `0`.

## Known gap

`deploy.sh`'s "clone a fresh `lxgo`" path (no `Paths.lxgo-auth` override) doesn't fully work yet: `lxgo-auth`'s
own `Dockerfile` is still written for the private workspace it was developed in (`WORKDIR /workspace/lxgo-auth`,
a build context one level up to see sibling packages' `replace` directives) - the public `lxgo` repo has the
same package at `auth/`, not `lxgo-auth/`, without those directives (export strips them). Until that Dockerfile
is made self-contained (already tracked as pre-release debt in `lxgo-auth`'s own `README.local.md`), use
`Paths.lxgo-auth` to point at a checkout that already works - the private workspace's own `lxgo-auth/`, most
likely.
