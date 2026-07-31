#!/usr/bin/env bash
# Render's shared build infrastructure gets rate-limited (429) by the public
# npm registry often enough that npm's own internal fetch-retries aren't
# reliable on their own. Retry the whole install step, not just one request.
set -euo pipefail

retry() {
  local attempt=1
  local max=8
  local delay=15
  until "$@"; do
    if [ "$attempt" -ge "$max" ]; then
      echo "Failed after $max attempts: $*" >&2
      return 1
    fi
    echo "Attempt $attempt failed, retrying in ${delay}s..." >&2
    sleep "$delay"
    attempt=$((attempt + 1))
    # Cap growth so a run of failures doesn't blow past Render's build timeout.
    if [ "$delay" -lt 60 ]; then delay=$((delay * 2)); fi
  done
}

# Fewer parallel connections trips burst-based rate limiting less often, and
# --prefer-offline reuses whatever a prior failed attempt already cached
# instead of re-fetching the whole dependency tree from scratch each retry.
export npm_config_maxsockets=3

retry npm ci --prefer-offline
npm run build
cd .medusa/server
retry npm install --omit=dev --prefer-offline
