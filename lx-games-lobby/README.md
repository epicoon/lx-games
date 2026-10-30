# lx-games-lobby

> Actual version: `v0.1.0-alpha.4`. [Details](./CHANGE_LOG.md)

## Prepare

```
cp runtime/.env.example runtime/.env
cp runtime/config-local-example.yaml runtime/config-local.yaml
```

Then edit both - needed whether you run locally or in Docker below.
`runtime/.env` overrides `runtime/config.yaml`'s `${VAR}` placeholders
(the app's port); absent entirely, the defaults baked into `config.yaml`
apply. `runtime/config-local.yaml` sets `Cartridges` - which cartridges
this lobby is allowed to dial, see its own comment - and a few other
per-deployment overrides; `config.yaml`'s `Local: config-local.yaml` merges
it in.

Online play needs an [lxgo/auth](https://github.com/epicoon/lxgo/tree/master/auth) instance to authenticate
against: register this lobby as a client on it (`client:new --redirect-uri=<this lobby's own
origin>/auth-callback` - the URI itself is never dialed, see "Sign in / sign up" below, but still has to match
exactly what's registered) and set the printed `ID`/`Secret`, together with that `redirect_uri` and the
`lxgo/auth` instance's own URL, under `Components.Auth` in `runtime/config-local.yaml`. That instance's own CORS
config also needs this lobby's origin added to `Components.Cors.Origins`.

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

The app (including its WS endpoint, mounted on the same HTTP server - see
`lxgo-ws`'s README) listens on every interface by default, so its single
published port is reachable from outside the container.

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

## Sign in / sign up

The lobby's own sign-in popup (`client/guiNodes/GuiMain.js`'s `_openSignIn`) authenticates directly against
[lxgo/auth](https://github.com/epicoon/lxgo/tree/master/auth) without ever navigating the browser away from the
lobby's page: `client/src/User.js`'s `signIn`/`signUp` call lxgo/auth's session-free `/remote/login`/
`/remote/signup` for an authorization code, then this lobby's own `/auth-exchange` (an
[lxgo/auth_client](https://github.com/epicoon/lxgo/tree/master/auth_client) `TokenExchangeHandler`) to turn that
code into a token pair, written to `localStorage` for lxgo/auth's JS bundle (`window.lxAuth`, loaded by
`runtime/templates/layout.html`) to pick up - `window.lxAuth.getUserData()` then supplies the real login shown in
the topbar. `/get-user`/`/auth-refresh`/`/logout` are the same package's other ready-made proxies, wired up the
same way for when the lobby needs them.
