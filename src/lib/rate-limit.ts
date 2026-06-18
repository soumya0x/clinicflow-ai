import { fail } from "@/lib/api";

/**
 * Lightweight in-memory fixed-window rate limiter.
 *
 * Good enough for a single serverless instance / dev. For multi-instance
 * production, swap the Map for Upstash Redis (@upstash/ratelimit) — the
 * `rateLimit()` signature stays the same.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Max requests per window. */
  limit?: number;
  /** Window length in milliseconds. */
  windowMs?: number;
}

export function rateLimit(
  key: string,
  { limit = 60, windowMs = 60_000 }: RateLimitOptions = {}
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  bucket.count += 1;
  const allowed = bucket.count <= limit;
  return {
    ok: allowed,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

/** Derive a client key from a request (best-effort IP). */
export function clientKey(req: Request, prefix = "ip"): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || "unknown";
  return `${prefix}:${ip}`;
}

/** Returns a 429 response when over the limit, otherwise null. */
export function enforceRateLimit(
  req: Request,
  opts?: RateLimitOptions & { prefix?: string }
): Response | null {
  const key = clientKey(req, opts?.prefix);
  const result = rateLimit(key, opts);
  if (!result.ok) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    return fail("Too many requests", 429, { retryAfter });
  }
  return null;
}
