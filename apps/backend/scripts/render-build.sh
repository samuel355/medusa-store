#!/usr/bin/env bash
# Render's shared build infrastructure gets rate-limited (429) by the public
# npm registry often enough that npm's own internal fetch-retries aren't
# reliable on their own. Retry the whole install step, not just one request.
set -euo pipefail

retry() {
  local attempt=1
  local max=5
  local delay=15
  until "$@"; do
    if [ "$attempt" -ge "$max" ]; then
      echo "Failed after $max attempts: $*" >&2
      return 1
    fi
    echo "Attempt $attempt failed, retrying in ${delay}s..." >&2
    sleep "$delay"
    attempt=$((attempt + 1))
    delay=$((delay * 2))
  done
}

retry npm ci
npm run build
cd .medusa/server
retry npm install --omit=dev
