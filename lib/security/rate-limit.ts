type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number; locked: boolean };

type Bucket = {
  count: number;
  windowStartedAt: number;
  lockedUntil: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;
let lastPruneAt = 0;

function nowMs() {
  return Date.now();
}

/** Drop expired buckets so the in-memory map cannot grow without bound. */
function pruneExpiredBuckets(current: number) {
  if (current - lastPruneAt < 60_000 && buckets.size < MAX_BUCKETS) return;
  lastPruneAt = current;

  for (const [key, bucket] of buckets) {
    const windowExpired = current - bucket.windowStartedAt >= 15 * 60_000;
    const lockExpired = !bucket.lockedUntil || bucket.lockedUntil <= current;
    if (windowExpired && lockExpired) {
      buckets.delete(key);
    }
  }

  // Hard cap under abuse: drop oldest entries by window start.
  if (buckets.size > MAX_BUCKETS) {
    const overflow = buckets.size - MAX_BUCKETS;
    const oldest = [...buckets.entries()]
      .sort((a, b) => a[1].windowStartedAt - b[1].windowStartedAt)
      .slice(0, overflow);
    for (const [key] of oldest) {
      buckets.delete(key);
    }
  }
}

/** Best-effort client IP behind reverse proxies (Coolify/Nginx). Prefer proxy-set headers. */
export function getRequestClientIp(request: Request): string {
  // Nginx/Coolify typically set X-Real-IP to the connecting client (not spoofable by the client).
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // When the proxy appends, the rightmost entry is the one it added.
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    const fromProxy = parts[parts.length - 1];
    if (fromProxy) return fromProxy;
  }

  return "unknown";
}

export function getRateLimitBlock(key: string): RateLimitResult {
  const current = nowMs();
  const existing = buckets.get(key);
  if (existing?.lockedUntil && existing.lockedUntil > current) {
    return {
      ok: false,
      locked: true,
      retryAfterSec: Math.max(1, Math.ceil((existing.lockedUntil - current) / 1000)),
    };
  }
  return { ok: true };
}

/**
 * Fixed-window counter with optional lockout after the limit is exceeded.
 * In-memory only (fine for a single app instance).
 */
export function consumeRateLimit(
  key: string,
  options: {
    limit: number;
    windowMs: number;
    lockMs?: number;
  }
): RateLimitResult {
  const current = nowMs();
  pruneExpiredBuckets(current);
  const existing = buckets.get(key);

  if (existing?.lockedUntil && existing.lockedUntil > current) {
    return {
      ok: false,
      locked: true,
      retryAfterSec: Math.max(1, Math.ceil((existing.lockedUntil - current) / 1000)),
    };
  }

  if (!existing || current - existing.windowStartedAt >= options.windowMs) {
    buckets.set(key, {
      count: 1,
      windowStartedAt: current,
      lockedUntil: 0,
    });
    return { ok: true };
  }

  existing.count += 1;

  if (existing.count > options.limit) {
    const lockMs = options.lockMs ?? options.windowMs;
    existing.lockedUntil = current + lockMs;
    return {
      ok: false,
      locked: true,
      retryAfterSec: Math.max(1, Math.ceil(lockMs / 1000)),
    };
  }

  return { ok: true };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
