# lx-games-cartridge

> Actual version: `v0.1.0-alpha.2`. [Details](./CHANGE_LOG.md)

## Prepare

```
cp runtime/.env.example runtime/.env
cp runtime/config-local-example.yaml runtime/config-local.yaml
```

Then edit both - needed whether you run locally or in Docker below.
`runtime/.env` overrides `runtime/config.yaml`'s `${VAR}` placeholders
(ports, `WS_HOST`, `CARTRIDGE_SLUG`, `LOBBY_URL`,
`CARTRIDGE_ADVERTISE_ADDR`); absent entirely, the defaults baked into
`config.yaml` apply, including an empty `LobbyURL` (no lobby configured -
this app is fully usable standalone either way). `runtime/config-local.yaml`
holds per-deployment overrides (WS limits, `jspp` mode); `config.yaml`'s
`Local: config-local.yaml` merges it in, so the file must exist.

## Running locally

```
go run . jspp:build-core      # once: builds runtime/web/build/core*.js (not in the repo)
go run .
```

## Docker

```
cd runtime
docker compose up -d --build
```

Only Docker is needed on the host: the image is built in a build stage that has
Go (it compiles the binary and generates the jspp core, `core.js`/`core-server.js`),
and the final image carries just the results. `./runtime` is bind-mounted over
`/app/runtime`, so the core built into the image is copied to
`runtime/web/build` on every container start. The first build takes a couple of
minutes (the Go image and the dependencies are downloaded).

`docker-compose.yml` lives in the module root (the usual place), but the
`docker compose` command still has to be run from `runtime/` - see `cd
runtime` above. Compose can find a compose file by walking up parent
directories, but it still looks for `.env` wherever it was actually
invoked from, not next to the file it found - so `runtime/.env` (and only
it) both configures the container (bind-mounted in as `runtime/.env`, read
directly by `lxgo-kernel/config.Load`) and drives Compose's own host-side
port mapping. There's exactly one `.env` for this whole deployment.

This is a single, independent deployment unit - it has no idea where
`lx-games-lobby` runs, or whether it runs at all. `LOBBY_URL` (see Prepare
above) is that lobby's real, externally reachable URL (a different server,
a different Docker host, wherever it actually is) - not a Docker service
name, since the two are never assumed to share a network.

`WS_HOST` defaults to `0.0.0.0` in `.env.example` - the WS listener has to
bind every interface for its published port to actually be reachable from
outside the container at all, which is exactly why `CARTRIDGE_ADVERTISE_ADDR`
usually needs setting too: the address this app announces to the lobby has
to be something the lobby can actually dial back into, and `0.0.0.0:<port>`
isn't - set it to this host's real address and `WS_PORT_EXTERNAL` (the
externally reachable port, which needn't match the container-internal
`WS_PORT` at all).

`docker-compose.yml` mounts `./runtime` into the container, so
`runtime/config.yaml` edits take effect on the next restart without
rebuilding the image.

## API

WS-request routes (see `lxgo-ws`'s README) on this app's own `WSServer`,
answered for whichever lobby has dialed in - see the protocol diagram in
the top-level `lx-games/README.md`. Not plain HTTP.

- `/nomenclature` - `{slug, games: [...]}`. `slug` is this app's own
  `CartridgeSlug`; each entry in `games` describes one game type this
  cartridge hosts (`name`, `slug`, `version`, `description`, `image`,
  `minSlots`, `maxSlots`, `online`, `offline`).
- `/rooms` - `[]`. Active game instances; always empty for now - no game
  engine exists yet to have created any.
- `/ping` - `{ok: true}`. Liveness check.

The other direction: this app POSTs `{addr}` to `<LobbyURL>/cartridge/announce`
once at startup (see `app/cartridge_setup.go`) - plain HTTP, not a
WS-request.

`/seabattle` and `/ootv` are separate, unrelated routes - each a `jspp`
plugin serving that game's browser UI directly (`/ootv` is currently
offline-only), nothing to do with the lobby↔cartridge protocol above.
