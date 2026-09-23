/**
 * Simple in-memory sliding-window rate limiter, keyed by API key.
 *
 * IMPORTANT: On serverless platforms (Vercel), each function instance has its
 * own memory, so this limit is enforced per-instance, not globally. That's
 * fine as a basic abuse guard, but if you need a hard global limit across all
 * instances, swap this for a Redis-backed limiter (e.g. Upstash Redis +
 * @upstash/ratelimit) using the same interface below.
 */

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;

export function checkRateLimit(
  key: string,
  limitPerMinute: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limitPerMinute - 1, resetAt: now + WINDOW_MS };
  }

  if (existing.count >= limitPerMinute) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.windowStart + WINDOW_MS,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limitPerMinute - existing.count,
    resetAt: existing.windowStart + WINDOW_MS,
  };
}

// Periodically clear stale buckets so memory doesn't grow unbounded
// on long-lived processes (VPS/Render), harmless no-op on serverless.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.windowStart >= WINDOW_MS * 2) buckets.delete(key);
  }
}, WINDOW_MS).unref?.();
