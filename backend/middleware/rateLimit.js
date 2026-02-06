/**
 * Per-user rate limiting for protected endpoints.
 * Uses in-memory store; keyed by req.user.id (set by requireAuth).
 * Env: RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX.
 */
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000; // 1 min
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 30; // requests per window

// In-memory: { [userId]: { count, resetAt } }
const store = new Map();

function cleanup() {
  const now = Date.now();
  for (const [key, val] of store.entries()) {
    if (val.resetAt < now) store.delete(key);
  }
}
setInterval(cleanup, 60 * 1000);

function rateLimitByUser(req, res, next) {
  const userId = req.user?.id;
  if (!userId) return next(); // let requireAuth handle

  const now = Date.now();
  let entry = store.get(userId);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    store.set(userId, entry);
  }
  entry.count += 1;

  if (entry.count > RATE_LIMIT_MAX) {
    const requestId = req.id || `req-${Date.now()}`;
    console.log(`[${new Date().toISOString()}] rate limit exceeded user_id=${userId} route=${req.path}`);
    return res.status(429).json({ error: 'Too many requests. Try again later.', request_id: requestId });
  }
  next();
}

module.exports = { rateLimitByUser, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX };
