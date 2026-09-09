#!/bin/sh
set -e

# ./runtime is bind-mounted over /app/runtime, which hides anything the image
# could have put there - so the core built into the image is copied into place
# on every start (this also keeps it matching the image's jspp version).
mkdir -p /app/runtime/web/build
cp /app/core/* /app/runtime/web/build/

exec /app/bin "$@"
