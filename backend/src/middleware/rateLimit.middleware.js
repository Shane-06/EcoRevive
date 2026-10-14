const { RateLimitExceededError } = require('../utils/errors');

/**
 * In-memory sliding-window rate limiting middleware factory.
 * Follows existing EcoRevive middleware and error conventions.
 *
 * @param {object} [options={}]
 * @param {number} [options.windowMs=60000] - Window duration in milliseconds (default: 60s)
 * @param {number} [options.max=20] - Max requests per window per entity (default: 20)
 * @param {string} [options.message='Rate limit exceeded. Maximum 20 requests per minute allowed.'] - Error message
 * @param {string} [options.code='RATE_LIMIT_EXCEEDED'] - Error code
 * @param {Function} [options.keyGenerator] - Custom key extraction function
 * @returns {import('express').RequestHandler & { reset: Function, close: Function, getStoreSize: Function }}
 */
function createRateLimiter(options = {}) {
  const windowMs = typeof options.windowMs === 'number' ? options.windowMs : 60 * 1000;
  const max = typeof options.max === 'number' ? options.max : 20;
  const message = options.message || 'Rate limit exceeded. Maximum 20 requests per minute allowed.';
  const code = options.code || 'RATE_LIMIT_EXCEEDED';

  const keyGenerator =
    options.keyGenerator ||
    ((req) => {
      if (req.user && req.user.id) {
        return `user:${req.user.id}`;
      }
      return `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
    });

  // Map of key -> Array<number> (timestamps in epoch milliseconds)
  const hitStore = new Map();

  // Periodic cleanup every windowMs to avoid unbounded memory growth
  const cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, timestamps] of hitStore.entries()) {
      const active = timestamps.filter(ts => ts > cutoff);
      if (active.length === 0) {
        hitStore.delete(key);
      } else {
        hitStore.set(key, active);
      }
    }
  }, windowMs);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  const rateLimitMiddleware = (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const cutoff = now - windowMs;

    const timestamps = (hitStore.get(key) || []).filter(ts => ts > cutoff);

    if (timestamps.length >= max) {
      // Oldest timestamp in current window determines when a slot will free up
      const oldest = timestamps[0];
      const resetTimeMs = oldest + windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));

      res.setHeader('Retry-After', retryAfterSeconds.toString());
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTimeMs / 1000).toString());

      return next(
        new RateLimitExceededError(message, code, {
          retryAfter: retryAfterSeconds,
          limit: max,
          windowMs,
        })
      );
    }

    timestamps.push(now);
    hitStore.set(key, timestamps);

    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - timestamps.length).toString());

    return next();
  };

  rateLimitMiddleware.reset = () => {
    hitStore.clear();
  };

  rateLimitMiddleware.getStoreSize = () => hitStore.size;

  rateLimitMiddleware.close = () => {
    clearInterval(cleanupTimer);
  };

  return rateLimitMiddleware;
}

// Pre-configured rate limiter for AI endpoints: 20 requests per minute
const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'EcoGuide rate limit exceeded. You may send up to 20 requests per minute.',
  code: 'RATE_LIMIT_EXCEEDED',
});

module.exports = {
  createRateLimiter,
  aiRateLimiter,
};
