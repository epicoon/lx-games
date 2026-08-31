# lx-games-lobby

> Actual version: `v0.1.0-alpha.1`. [Details](./CHANGE_LOG.md)

## Prepare

```
cp runtime/.env.example runtime/.env
cp runtime/config-local-example.yaml runtime/config-local.yaml
```

Then edit both - needed whether you run locally or in Docker below.
`runtime/.env` overrides `runtime/config.yaml`'s `${VAR}` placeholders
(ports, `WS_HOST`); absent entirely, the defaults baked into `config.yaml`
apply. `runtime/config-local.yaml` sets `Cartridges` - which cartridges
this lobby is allowed to dial, see its own comment - and a few other
per-deployment overrides; `config.yaml`'s `Local: config-local.yaml` merges
it in.

## Running locally

```
go run .
```

## Docker

```
./build.sh                    # cross-compiles ./bin for linux/amd64
cd runtime
docker compose up -d --build
```

`docker-compose.yml` lives in the module root, but the
`docker compose` command has to be run from `runtime/` - Compose can
find a compose file by walking up parent directories, but it still looks
for `.env` wherever it was actually invoked from.

`WS_HOST` defaults to `0.0.0.0` in `.env.example` - the WS listener has to
bind every interface for its published port to actually be reachable from
outside the container at all.

`docker-compose.yml` mounts `./runtime` into the container, so
`runtime/config.yaml`/`runtime/config-local.yaml` edits (adding a
cartridge included) take effect on the next restart, without rebuilding
the image.

## API

- `POST /cartridge/announce` - `{addr: "host:port"}`. What a cartridge
  calls on its own startup to tell the lobby it's up (see
  `lx-games-cartridge`'s `LobbyURL`/`cartridge_setup.go`). The lobby is what
  actually establishes the WS connection back; this call is just the
  trigger to do that sooner than the next scheduled check.
  - `200 {ok: true}` - accepted (a connection attempt was scheduled, not
    necessarily one that will succeed).
  - `400` - missing `addr`.
  - `403` - `addr` isn't in this lobby's own `Cartridges` list; silently
    rejected rather than dialing an arbitrary caller-supplied address.

`/` and `/admin` (`LobbyPlugin`/`AdminPlugin`, browser-facing) are page
routes, not part of this protocol - the lobby's own player-facing WS
channel doesn't exist yet as a distinct API.
