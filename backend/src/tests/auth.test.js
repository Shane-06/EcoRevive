const request = require('supertest');
const app = require('../app');
const { query, closePool } = require('../config/db');
const userRepository = require('../repositories/user.repository');

describe('Milestone 4 — Authentication Endpoints & Security', () => {
  const testUsers = {
    contributor: {
      name: 'Govind Contributor',
      email: 'govind.contributor.m4@example.com',
      password: 'SecurePassword123!',
    },
    duplicateCheck: {
      name: 'Duplicate Test',
      email: 'duplicate.m4@example.com',
      password: 'SecurePassword123!',
    },
  };

  let registeredToken = null;

  afterAll(async () => {
    // Clean up created test users from real database
    await query("DELETE FROM users WHERE email LIKE '%@example.com';");
    await closePool();
  });

  describe('POST /api/v1/auth/register', () => {
    it('SRS-AUTH-01: should register a new user successfully and return user profile + JWT token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUsers.contributor);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('token');

      const user = res.body.data.user;
      expect(user).toHaveProperty('id');
      expect(user.name).toBe(testUsers.contributor.name);
      expect(user.email).toBe(testUsers.contributor.email.toLowerCase());
      expect(user.role).toBe('contributor'); // Default role

      // Security: never return password or password_hash
      expect(user.password).toBeUndefined();
      expect(user.password_hash).toBeUndefined();

      registeredToken = res.body.data.token;
      expect(typeof registeredToken).toBe('string');
      expect(registeredToken.split('.').length).toBe(3); // JWT header.payload.sig
    });

    it('SRS-AUTH-03: should store password as bcrypt hash in database, not plaintext', async () => {
      const dbUser = await userRepository.findByEmail(testUsers.contributor.email);
      expect(dbUser).toBeDefined();
      expect(dbUser.password_hash).toBeDefined();
      expect(dbUser.password_hash).not.toBe(testUsers.contributor.password);
      expect(dbUser.password_hash.startsWith('$2a$') || dbUser.password_hash.startsWith('$2b$')).toBe(true);
    });

    it('should ignore/reject client attempts to self-assign elevated roles (admin/caretaker)', async () => {
      const hackerPayload = {
        name: 'Hacker User',
        email: 'hacker.m4@example.com',
        password: 'Password123!',
        role: 'admin', // Should be overridden to contributor
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(hackerPayload);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.user.role).toBe('contributor');

      // Verify in DB directly
      const dbHacker = await userRepository.findByEmail(hackerPayload.email);
      expect(dbHacker.role).toBe('contributor');
    });

    it('should reject duplicate email registration with 409 Conflict', async () => {
      // First registration
      await request(app).post('/api/v1/auth/register').send(testUsers.duplicateCheck);

      // Duplicate attempt
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUsers.duplicateCheck);

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'CONFLICT');
      expect(res.body.error.message).toContain('already exists');
    });

    it('should reject registration missing name, email, or password with 400 Bad Request', async () => {
      const missingName = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com', password: 'pwd' });
      expect(missingName.statusCode).toBe(400);

      const missingEmail = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Test', password: 'pwd' });
      expect(missingEmail.statusCode).toBe(400);

      const invalidEmail = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Test', email: 'notanemail', password: 'pwd' });
      expect(invalidEmail.statusCode).toBe(400);

      const missingPassword = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Test', email: 'test2@example.com' });
      expect(missingPassword.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('SRS-AUTH-02: should login successfully with valid credentials and return JWT token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUsers.contributor.email,
          password: testUsers.contributor.password,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe(testUsers.contributor.email.toLowerCase());
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it('should reject login with wrong password without leaking internal details (401)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUsers.contributor.email,
          password: 'IncorrectPassword999!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should reject login with non-existent email safely (401)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent.user.m4@example.com',
          password: 'SomePassword123!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('SRS-AUTH-04: should return authenticated user profile when valid Bearer JWT is provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${registeredToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.name).toBe(testUsers.contributor.name);
      expect(res.body.data.user.email).toBe(testUsers.contributor.email.toLowerCase());
      expect(res.body.data.user.role).toBe('contributor');
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it('should reject /auth/me when Authorization header is missing (401)', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'AUTHENTICATION_REQUIRED');
    });

    it('should reject /auth/me with malformed Authorization header (401)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidFormatHeader');
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'AUTHENTICATION_REQUIRED');
    });

    it('should reject /auth/me with invalid JWT token (401)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.signature');
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'INVALID_TOKEN');
    });
  });
});
