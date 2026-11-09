/**
 * A small in-memory, per-IP sliding-window rate limiter for abuse-prone,
 * usually unauthenticated endpoints (sign-up, password reset, OTP sends).
 *
 * Scope and limits: the counters live in this process's memory, so they are
 * per-instance and reset when the server restarts. Closebuy runs a single Fly
 * instance today, which this covers. If you ever scale to more than one
 * instance, back this with a shared store (e.g. Upstash/Redis) so the limit is
 * enforced across all of them — keep this same interface and swap the Map.
 *
 * This is one layer. Edge/CDN rate limiting (Fly/Cloudflare) in front of the
 * app is still the right place to stop high-volume floods.
 */

type Hit = number[];
const BUCKETS = new Map<string, Hit>();
let lastSweep = 0;

/** Drops timestamps older than the window, and occasionally clears empty keys so the map can't grow forever. */
function recent(key: string, windowMs: number): Hit {
  const now = Date.now();
  const hits = (BUCKETS.get(key) ?? []).filter((t) => now - t < windowMs);
  BUCKETS.set(key, hits);
  if (now - lastSweep > 10 * 60 * 1000) {
    lastSweep = now;
    for (const [k, v] of BUCKETS) if (v.every((t) => now - t >= windowMs)) BUCKETS.delete(k);
  }
  return hits;
}

/** The caller's IP, trusting the proxy headers Fly/Cloudflare set in front of the app. */
export function clientIp(request: Request): string {
  const fly = request.headers.get('fly-client-ip');
  if (fly) return fly.trim();
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

/**
 * Records one hit for `key` and says whether it is within `limit` per `windowMs`.
 * On refusal, `retryAfter` is whole seconds until the oldest hit ages out.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const hits = recent(key, windowMs);
  if (hits.length >= limit) {
    const retryAfter = Math.max(1, Math.ceil((hits[0] + windowMs - Date.now()) / 1000));
    return { ok: false, retryAfter };
  }
  hits.push(Date.now());
  return { ok: true };
}

/** Convenience wrapper: limit by the request's IP under a named bucket. */
export function limitByIp(request: Request, bucket: string, limit: number, windowMs: number): RateLimitResult {
  return rateLimit(`${bucket}:${clientIp(request)}`, limit, windowMs);
}

/** A ready-made 429 JSON Response (with a Retry-After header) for a refused request. */
export function tooMany(retryAfter: number): Response {
  return new Response(JSON.stringify({ error: 'Too many requests. Please wait a little and try again.' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
  });
}
