// ============================================================
// RATE LIMIT — best-effort spend guard for a public endpoint.
//
// HONEST LIMITATION: this is per-instance memory. Vercel runs several function
// instances concurrently and recycles them, so the real ceiling is roughly
// (limit x live instances), and it resets on cold start. That's fine for
// "stop one person hammering it in a loop" and NOT fine as a hard budget cap.
//
// If this endpoint ever gets real traffic, swap the Map for Upstash Redis —
// the interface below doesn't change, only the storage. On Gemini's free tier
// the backstop is Google's own per-minute/per-day quota: when it runs out the
// API returns 429 and api/ask.js turns that into a polite "try again shortly"
// rather than an error. That's a graceful floor, not a limit you control.
// ============================================================

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Limits are environment-aware rather than a constant you edit, so a number
// raised for an afternoon of testing can't silently ship to production. Local
// dev is effectively uncapped; the deployed function keeps the real limit.
// ASK_RATE_LIMIT overrides both when you want to test the 429 path itself
// (`ASK_RATE_LIMIT=2 npm run dev` and the third question gets refused).
const isProd = process.env.NODE_ENV === 'production';
const override = Number(process.env.ASK_RATE_LIMIT);

const MAX_PER_WINDOW = Number.isFinite(override) && override > 0
  ? override
  : isProd
    ? 20 // questions per IP per hour, live
    : 1000; // dev: don't get in your own way

const MAX_GLOBAL_PER_WINDOW = isProd ? 400 : 100_000; // per instance, per hour

const buckets = new Map();
let globalCount = 0;
let globalResetAt = Date.now() + WINDOW_MS;

// Keep the Map from growing without bound across a long-lived instance.
function sweep(now) {
  if (buckets.size < 5000) return;
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
}

export function checkRateLimit(ip) {
  const now = Date.now();

  if (now >= globalResetAt) {
    globalCount = 0;
    globalResetAt = now + WINDOW_MS;
  }
  if (globalCount >= MAX_GLOBAL_PER_WINDOW) {
    return {
      ok: false,
      reason: 'This FAQ is getting a lot of questions right now. Try again later.',
      retryAfter: Math.ceil((globalResetAt - now) / 1000),
    };
  }

  sweep(now);
  let bucket = buckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(ip, bucket);
  }
  if (bucket.count >= MAX_PER_WINDOW) {
    return {
      ok: false,
      reason: `That's ${MAX_PER_WINDOW} questions in an hour — you've hit the limit. Email me instead: anshmadaanmks@gmail.com`,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  globalCount += 1;
  return { ok: true, remaining: MAX_PER_WINDOW - bucket.count };
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}
