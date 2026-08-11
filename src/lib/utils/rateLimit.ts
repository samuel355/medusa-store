// In-memory sliding-window limiter. Good enough because this app runs as a
// long-lived Node process (render.yaml/railway.json), not isolated
// serverless functions with no shared state between requests - it just
// won't coordinate across multiple instances if the storefront is ever
// horizontally scaled.
const buckets = new Map<string, number[]>();

// Bound memory: without this, an attacker cycling through IPs/identifiers
// forever would grow this map without limit.
const MAX_TRACKED_KEYS = 50_000;

export function rateLimit(key: string, opts: { limit: number; windowMs: number }): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const windowStart = now - opts.windowMs;

  const hits = (buckets.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

  if (hits.length >= opts.limit) {
    return { allowed: false, retryAfterMs: hits[0] + opts.windowMs - now };
  }

  hits.push(now);
  buckets.set(key, hits);

  if (buckets.size > MAX_TRACKED_KEYS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey !== undefined) buckets.delete(oldestKey);
  }

  return { allowed: true };
}

export function clientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
