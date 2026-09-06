const request = require('supertest');
const app = require('../app');
const {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
} = require('../utils/errors');

describe('Milestone 2 — Error Handling & Routing Middleware', () => {
  describe('Unknown Route Handling (404)', () => {
    it('should return 404 with standard error envelope for non-existent GET route', async () => {
      const res = await request(app).get('/api/v1/non-existent-route');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(res.body.error.message).toContain('Route not found');
    });

    it('should return 404 with standard error envelope for non-existent POST route', async () => {
      const res = await request(app).post('/unregistered-endpoint').send({});
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('Malformed JSON Payload Handling (400)', () => {
    it('should return 400 with INVALID_JSON_BODY error code for invalid JSON body', async () => {
      const res = await request(app)
        .post('/api/health')
        .set('Content-Type', 'application/json')
        .send('{ invalid json payload ');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'INVALID_JSON_BODY');
      expect(res.body.error.message).toContain('Malformed JSON');
    });
  });

  describe('Application Error Classes', () => {
    it('should construct AppError with correct properties', () => {
      const err = new AppError('Custom test error', 418, 'I_AM_A_TEAPOT', { extra: 'info' });
      expect(err.message).toBe('Custom test error');
      expect(err.statusCode).toBe(418);
      expect(err.code).toBe('I_AM_A_TEAPOT');
      expect(err.details).toEqual({ extra: 'info' });
      expect(err.isOperational).toBe(true);
    });

    it('should construct BadRequestError with status 400', () => {
      const err = new BadRequestError('Invalid input');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
    });

    it('should construct UnauthorizedError with status 401', () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
    });

    it('should construct ForbiddenError with status 403', () => {
      const err = new ForbiddenError();
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });

    it('should construct NotFoundError with status 404', () => {
      const err = new NotFoundError();
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
    });

    it('should construct ConflictError with status 409', () => {
      const err = new ConflictError();
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT');
    });

    it('should construct ValidationError with status 422', () => {
      const err = new ValidationError('Field missing', { field: 'name' });
      expect(err.statusCode).toBe(422);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.details).toEqual({ field: 'name' });
    });
  });
});
