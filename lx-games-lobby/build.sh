#!/usr/bin/env sh
set -e

echo "🔨 Building Go binary for Linux amd64..."

GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o bin .

echo "✅ Build complete: ./bin"
ls -lh bin
