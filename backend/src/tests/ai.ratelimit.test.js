const { createRateLimiter, aiRateLimiter } = require('../middleware/rateLimit.middleware');
const errorHandler = require('../middleware/error.middleware');
const express = require('express');
const request = require('supertest');

describe('AI Rate Limiting Middleware (V2-M1)', () => {
  afterEach(() => {
    aiRateLimiter.reset();
  });

  afterAll(() => {
    aiRateLimiter.close();
  });

  it('RATE-01: Allows requests up to the max threshold (20 req/min)', async () => {
    const app = express();
    const limiter = createRateLimiter({ windowMs: 10000, max: 5 });

    app.use((req, res, next) => {
      req.user = { id: 'user-uuid-1', role: 'contributor' };
      next();
    });
    app.use(limiter);
    app.get('/test', (req, res) => res.json({ success: true }));
    app.use(errorHandler);

    // Make 5 requests - all should succeed
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe('5');
      expect(res.headers['x-ratelimit-remaining']).toBe(String(5 - (i + 1)));
    }

    limiter.close();
  });

  it('RATE-02: Rejects requests exceeding threshold with HTTP 429 and RATE_LIMIT_EXCEEDED code', async () => {
    const app = express();
    const limiter = createRateLimiter({
      windowMs: 60000,
      max: 2,
      message: 'Rate limit exceeded for test.',
    });

    app.use((req, res, next) => {
      req.user = { id: 'user-uuid-2', role: 'contributor' };
      next();
    });
    app.use(limiter);
    app.get('/test', (req, res) => res.json({ success: true }));
    app.use(errorHandler);

    // First two requests pass
    await request(app).get('/test').expect(200);
    await request(app).get('/test').expect(200);

    // Third request is rate limited
    const res = await request(app).get('/test');
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBe('0');
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded for test.',
        details: {
          retryAfter: expect.any(Number),
          limit: 2,
          windowMs: 60000,
        },
      },
    });

    limiter.close();
  });

  it('RATE-03: Segregates rate limit buckets per authenticated user ID', async () => {
    const app = express();
    let currentUserId = 'user-a';

    const limiter = createRateLimiter({ windowMs: 60000, max: 1 });

    app.use((req, res, next) => {
      req.user = { id: currentUserId, role: 'contributor' };
      next();
    });
    app.use(limiter);
    app.get('/test', (req, res) => res.json({ success: true }));
    app.use(errorHandler);

    // User A makes 1 request -> OK
    currentUserId = 'user-a';
    await request(app).get('/test').expect(200);

    // User A makes 2nd request -> 429
    await request(app).get('/test').expect(429);

    // User B makes 1st request -> OK (separate bucket)
    currentUserId = 'user-b';
    await request(app).get('/test').expect(200);

    limiter.close();
  });

  it('RATE-04: Falls back to IP address when request is unauthenticated', async () => {
    const app = express();
    const limiter = createRateLimiter({ windowMs: 60000, max: 1 });

    app.use(limiter);
    app.get('/test', (req, res) => res.json({ success: true }));
    app.use(errorHandler);

    await request(app).get('/test').expect(200);
    await request(app).get('/test').expect(429);

    limiter.close();
  });

  it('RATE-05: Clears rate limits when reset() is called', async () => {
    const app = express();
    const limiter = createRateLimiter({ windowMs: 60000, max: 1 });

    app.use((req, res, next) => {
      req.user = { id: 'user-c', role: 'contributor' };
      next();
    });
    app.use(limiter);
    app.get('/test', (req, res) => res.json({ success: true }));
    app.use(errorHandler);

    await request(app).get('/test').expect(200);
    await request(app).get('/test').expect(429);

    // Reset store
    limiter.reset();

    // Now request succeeds again
    await request(app).get('/test').expect(200);

    limiter.close();
  });
});
