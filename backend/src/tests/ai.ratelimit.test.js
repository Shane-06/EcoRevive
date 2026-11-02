const { createRateLimiter, aiRateLimiter, publicRateLimiter } = require('../middleware/rateLimit.middleware');
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

  it('RATE-06: AI rate limiter uses user-based keying so different users from the same IP have independent limits', async () => {
    const app = express();
    app.set('trust proxy', true);
    let currentUser = null;

    app.use((req, res, next) => {
      req.user = currentUser;
      next();
    });
    app.use(aiRateLimiter);
    app.get('/ai-test', (req, res) => res.json({ success: true }));
    app.use(errorHandler);

    const sharedIp = '203.0.113.50';

    // User 1 sends 20 requests from sharedIp (reaches limit)
    currentUser = { id: 'user-ai-1', role: 'contributor' };
    for (let i = 0; i < 20; i++) {
      await request(app)
        .get('/ai-test')
        .set('X-Forwarded-For', sharedIp)
        .expect(200);
    }

    // User 1 request 21 from sharedIp -> 429
    await request(app)
      .get('/ai-test')
      .set('X-Forwarded-For', sharedIp)
      .expect(429);

    // User 2 from the SAME sharedIp -> 200 OK (independent user-based bucket)
    currentUser = { id: 'user-ai-2', role: 'contributor' };
    const resUser2 = await request(app)
      .get('/ai-test')
      .set('X-Forwarded-For', sharedIp);
    expect(resUser2.status).toBe(200);
    expect(resUser2.headers['x-ratelimit-limit']).toBe('20');
    expect(resUser2.headers['x-ratelimit-remaining']).toBe('19');
  });
});

describe('Public Registry Rate Limiting Middleware (V2-M6)', () => {
  afterEach(() => {
    publicRateLimiter.reset();
  });

  afterAll(() => {
    publicRateLimiter.close();
  });

  it('PUB-RATE-01: Returns HTTP 429 after 60 requests from the same IP', async () => {
    const app = express();
    app.set('trust proxy', true);
    app.use(publicRateLimiter);
    app.get('/public-test', (req, res) => res.json({ success: true }));
    app.use(errorHandler);

    const testIp = '198.51.100.1';

    // Send 60 requests from IP 198.51.100.1 - all should succeed
    for (let i = 0; i < 60; i++) {
      const res = await request(app)
        .get('/public-test')
        .set('X-Forwarded-For', testIp);
      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe('60');
      expect(res.headers['x-ratelimit-remaining']).toBe(String(60 - (i + 1)));
    }

    // 61st request from same IP is rate limited
    const res = await request(app)
      .get('/public-test')
      .set('X-Forwarded-For', testIp);
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
    expect(res.headers['x-ratelimit-limit']).toBe('60');
    expect(res.headers['x-ratelimit-remaining']).toBe('0');
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'PUBLIC_RATE_LIMIT_EXCEEDED',
        message: 'Public registry rate limit exceeded. You may send up to 60 requests per minute.',
        details: {
          retryAfter: expect.any(Number),
          limit: 60,
          windowMs: 60000,
        },
      },
    });
  });

  it('PUB-RATE-02: Two requests from the same IP share the same limit, including authenticated requests', async () => {
    const app = express();
    app.set('trust proxy', true);
    let currentUser = null;

    app.use((req, res, next) => {
      req.user = currentUser;
      next();
    });
    app.use(publicRateLimiter);
    app.get('/public-test', (req, res) => res.json({ success: true }));
    app.use(errorHandler);

    const testIp = '198.51.100.2';

    // 1st request: Authenticated User A from testIp
    currentUser = { id: 'user-alpha', role: 'contributor' };
    const res1 = await request(app)
      .get('/public-test')
      .set('X-Forwarded-For', testIp);
    expect(res1.status).toBe(200);
    expect(res1.headers['x-ratelimit-remaining']).toBe('59');

    // 2nd request: Authenticated User B from same testIp
    currentUser = { id: 'user-beta', role: 'admin' };
    const res2 = await request(app)
      .get('/public-test')
      .set('X-Forwarded-For', testIp);
    expect(res2.status).toBe(200);
    expect(res2.headers['x-ratelimit-remaining']).toBe('58');

    // 3rd request: Unauthenticated request from same testIp
    currentUser = null;
    const res3 = await request(app)
      .get('/public-test')
      .set('X-Forwarded-For', testIp);
    expect(res3.status).toBe(200);
    expect(res3.headers['x-ratelimit-remaining']).toBe('57');
  });

  it('PUB-RATE-03: Two different IPs have independent rate limit buckets', async () => {
    const app = express();
    app.set('trust proxy', true);
    app.use(publicRateLimiter);
    app.get('/public-test', (req, res) => res.json({ success: true }));
    app.use(errorHandler);

    const ipA = '198.51.100.10';
    const ipB = '198.51.100.20';

    // IP A exhausts its 60 requests
    for (let i = 0; i < 60; i++) {
      await request(app)
        .get('/public-test')
        .set('X-Forwarded-For', ipA)
        .expect(200);
    }

    // IP A 61st request -> 429
    const resA = await request(app)
      .get('/public-test')
      .set('X-Forwarded-For', ipA);
    expect(resA.status).toBe(429);
    expect(resA.headers['x-ratelimit-remaining']).toBe('0');

    // IP B makes its 1st request -> 200 OK (fresh bucket, remaining 59)
    const resB = await request(app)
      .get('/public-test')
      .set('X-Forwarded-For', ipB);
    expect(resB.status).toBe(200);
    expect(resB.headers['x-ratelimit-limit']).toBe('60');
    expect(resB.headers['x-ratelimit-remaining']).toBe('59');
  });
});
