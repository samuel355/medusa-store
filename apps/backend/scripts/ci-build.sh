#!/usr/bin/env bash
# Shared build infrastructure (Render, Railway, ...) gets rate-limited (429) by
# the public npm registry often enough that npm's own internal fetch-retries
# aren't reliable on their own. Retry the whole install step, not just one request.
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
    # Cap growth so a run of failures doesn't blow past the platform's build timeout.
    if [ "$delay" -lt 60 ]; then delay=$((delay * 2)); fi
  done
}

# Fewer parallel connections trips burst-based rate limiting less often, and
# --prefer-offline reuses whatever a prior failed attempt already cached
# instead of re-fetching the whole dependency tree from scratch each retry.
export npm_config_maxsockets=3

# @medusajs/cli's entrypoint does require("ts-node").register({}) to load
# medusa-config.ts, silently no-op'ing if that fails (and NODE_ENV=production
# suppresses even the warning). ts-node is a devDependency here, and NODE_ENV
# =production makes npm ci skip devDependencies by default — so without
# --include=dev, ts-node never installs and medusa-config.ts can't load at
# all, failing later with a misleading "Cannot find module" error.
retry npm ci --prefer-offline --include=dev
npm run build
cd .medusa/server
retry npm install --omit=dev --prefer-offline
