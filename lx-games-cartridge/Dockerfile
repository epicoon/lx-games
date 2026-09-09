FROM golang:1.25-bookworm AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# The jspp core (core.js/core-server.js) is generated from the jspp module's own
# sources, which only exist here, and the command needs an app config to start:
# use the example local config when none is provided (the core doesn't depend on it).
RUN [ -f runtime/config-local.yaml ] || cp runtime/config-local-example.yaml runtime/config-local.yaml
RUN CGO_ENABLED=0 go build -o bin . \
    && mkdir -p runtime/web/build \
    && ./bin jspp:build-core

# Final image - just the binary and the built core.
FROM debian:bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    bash \
    procps \
    && rm -rf /var/lib/apt/lists/* \
    && update-ca-certificates

WORKDIR /app
COPY --from=build /src/bin /app/bin
COPY --from=build /src/runtime/web/build /app/core
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
