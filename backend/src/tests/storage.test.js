const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../app');
const config = require('../config');
const storageService = require('../services/storage.service');
const { query, closePool } = require('../config/db');

describe('Supabase & Local Storage Service Integration Tests', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const originalConfigStorage = { ...config.storage };

  let contributorUser;
  let otherContributorUser;
  let caretakerUser;
  let adminUser;

  let contributorToken;
  let otherContributorToken;
  let caretakerToken;
  let adminToken;

  const createdTreeIds = [];
  const testFilesToCleanup = [];

  beforeAll(async () => {
    // 1. Create test users with distinct roles
    const timestamp = Date.now();
    const mockPasswordHash = '$2a$10$wT2eXoOq4i5eN0hN6qg4z.vQxL7Q3f5fE0P4eXm4V9g1W2z4k4i1W';

    const [u1, u2, u3, u4] = await Promise.all([
      query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'contributor')
         RETURNING id, name, email, role;`,
        [`Store Contrib ${timestamp}`, `store_contrib_${timestamp}@ecorevive.org`, mockPasswordHash]
      ),
      query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'contributor')
         RETURNING id, name, email, role;`,
        [`Other Contrib ${timestamp}`, `other_contrib_${timestamp}@ecorevive.org`, mockPasswordHash]
      ),
      query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'caretaker')
         RETURNING id, name, email, role;`,
        [`Store Caretaker ${timestamp}`, `store_caretaker_${timestamp}@ecorevive.org`, mockPasswordHash]
      ),
      query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'admin')
         RETURNING id, name, email, role;`,
        [`Store Admin ${timestamp}`, `store_admin_${timestamp}@ecorevive.org`, mockPasswordHash]
      ),
    ]);

    contributorUser = u1.rows[0];
    otherContributorUser = u2.rows[0];
    caretakerUser = u3.rows[0];
    adminUser = u4.rows[0];

    // Generate JWT tokens
    const { signToken } = require('../utils/jwt');
    contributorToken = signToken({ id: contributorUser.id, role: contributorUser.role });
    otherContributorToken = signToken({ id: otherContributorUser.id, role: otherContributorUser.role });
    caretakerToken = signToken({ id: caretakerUser.id, role: caretakerUser.role });
    adminToken = signToken({ id: adminUser.id, role: adminUser.role });
  });

  afterAll(async () => {
    // Teardown created trees and health logs
    if (createdTreeIds.length > 0) {
      await query('DELETE FROM health_logs WHERE tree_id = ANY($1::uuid[]);', [createdTreeIds]);
      await query('DELETE FROM verifications WHERE tree_id = ANY($1::uuid[]);', [createdTreeIds]);
      await query('DELETE FROM trees WHERE id = ANY($1::uuid[]);', [createdTreeIds]);
    }

    // Teardown test users
    const userIds = [contributorUser?.id, otherContributorUser?.id, caretakerUser?.id, adminUser?.id].filter(Boolean);
    if (userIds.length > 0) {
      await query('DELETE FROM users WHERE id = ANY($1::uuid[]);', [userIds]);
    }

    // Clean up local test files
    for (const filePath of testFilesToCleanup) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (_e) {
        // Ignore test cleanup error
      }
    }

    process.env = { ...originalEnv };
    config.storage = { ...originalConfigStorage };
    global.fetch = originalFetch;
    await closePool();
  });

  beforeEach(() => {
    config.storage = { ...originalConfigStorage };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    config.storage = { ...originalConfigStorage };
  });

  // =========================================================================
  // 1. Storage Service Unit Tests (Local & Supabase Mode)
  // =========================================================================
  describe('1. Storage Service Unit Behavior', () => {
    it('STOR-01: Default provider is local; uploads return relative uploads/ path', async () => {
      config.storage.provider = 'local';

      const mockFile = {
        originalname: 'neem-sapling.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('mock-neem-image-content'),
      };

      const ref = await storageService.uploadFile({ file: mockFile, prefix: 'trees' });
      expect(ref).toMatch(/^uploads\/tree-/);

      const localDiskPath = path.join(__dirname, '../../', ref);
      testFilesToCleanup.push(localDiskPath);
      expect(fs.existsSync(localDiskPath)).toBe(true);

      const signed = await storageService.getSignedUrl(ref);
      expect(signed).toBe(`/${ref}`);
    });

    it('STOR-02: Supabase provider uploads buffer via REST API and returns stable object key', async () => {
      config.storage.provider = 'supabase';
      config.storage.supabaseUrl = 'https://mockproject.supabase.co';
      config.storage.supabaseServiceRoleKey = 'mock-service-role-key';
      config.storage.bucket = 'ecorevive-evidence';

      let capturedUrl = '';
      let capturedHeaders = {};
      let capturedBody = null;

      global.fetch = jest.fn().mockImplementation(async (url, opts) => {
        capturedUrl = url;
        capturedHeaders = opts.headers;
        capturedBody = opts.body;
        return {
          ok: true,
          status: 200,
          text: async () => 'OK',
          json: async () => ({ Key: 'ecorevive-evidence/trees/tree-test.jpg' }),
        };
      });

      const mockBuffer = Buffer.from('supabase-image-bytes');
      const mockFile = {
        originalname: 'plantation-evidence.png',
        mimetype: 'image/png',
        buffer: mockBuffer,
      };

      const key = await storageService.uploadFile({ file: mockFile, prefix: 'trees' });

      // Verifies stable key format (never absolute filesystem path, never signed URL)
      expect(key).toMatch(/^trees\/tree-\d+-\d+\.png$/);
      expect(key).not.toContain('http');
      expect(key).not.toContain('token');

      // Verifies Supabase REST call parameters
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(capturedUrl).toBe(`https://mockproject.supabase.co/storage/v1/object/ecorevive-evidence/${key}`);
      expect(capturedHeaders['Authorization']).toBe('Bearer mock-service-role-key');
      expect(capturedHeaders['Content-Type']).toBe('image/png');
      expect(capturedBody).toBe(mockBuffer);
    });

    it('STOR-03: Supabase provider handles health prefix and formats key under health/', async () => {
      config.storage.provider = 'supabase';
      config.storage.supabaseUrl = 'https://mockproject.supabase.co';
      config.storage.supabaseServiceRoleKey = 'mock-service-role-key';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      const mockFile = {
        originalname: 'leaf-observation.webp',
        mimetype: 'image/webp',
        buffer: Buffer.from('health-bytes'),
      };

      const key = await storageService.uploadFile({ file: mockFile, prefix: 'health' });
      expect(key).toMatch(/^health\/health-\d+-\d+\.webp$/);
    });

    it('STOR-04: Supabase upload throws AppError on failure response from Supabase', async () => {
      config.storage.provider = 'supabase';
      config.storage.supabaseUrl = 'https://mockproject.supabase.co';
      config.storage.supabaseServiceRoleKey = 'mock-service-role-key';

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => '{"error":"Bucket policy violation"}',
      });

      const mockFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('error-test-bytes'),
      };

      await expect(storageService.uploadFile({ file: mockFile, prefix: 'trees' })).rejects.toThrow(
        /Supabase Storage upload failed with status 403/
      );
    });

    it('STOR-05: Supabase getSignedUrl requests time-limited signed URL and returns signed token URL', async () => {
      config.storage.provider = 'supabase';
      config.storage.supabaseUrl = 'https://mockproject.supabase.co';
      config.storage.supabaseServiceRoleKey = 'mock-service-role-key';
      config.storage.bucket = 'ecorevive-evidence';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          signedURL: '/storage/v1/object/sign/ecorevive-evidence/trees/tree-sample.jpg?token=mock_jwt_token',
        }),
      });

      const signedUrl = await storageService.getSignedUrl('trees/tree-sample.jpg', 1800);
      expect(signedUrl).toBe(
        'https://mockproject.supabase.co/storage/v1/object/sign/ecorevive-evidence/trees/tree-sample.jpg?token=mock_jwt_token'
      );

      // Verify sign request payload
      expect(global.fetch).toHaveBeenCalledWith(
        'https://mockproject.supabase.co/storage/v1/object/sign/ecorevive-evidence/trees/tree-sample.jpg',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-service-role-key',
          }),
          body: JSON.stringify({ expiresIn: 1800 }),
        })
      );
    });
  });

  // =========================================================================
  // 2. End-to-End Plantation & Photo Upload Endpoints
  // =========================================================================
  describe('2. Plantation Upload & Authorized Photo Access', () => {
    it('API-STOR-01: Contributor uploads plantation photo in local mode -> stores uploads/ reference', async () => {
      config.storage.provider = 'local';

      const res = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .field('species', 'Neem')
        .field('latitude', '28.6139')
        .field('longitude', '77.2090')
        .field('plantedOn', '2026-09-01')
        .attach('photo', Buffer.from('mock-local-tree-image'), 'tree-evidence.jpg');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const tree = res.body.data.tree;
      expect(tree.photoReference).toMatch(/^uploads\/tree-/);
      createdTreeIds.push(tree.id);

      testFilesToCleanup.push(path.join(__dirname, '../../', tree.photoReference));
    });

    it('API-STOR-02: Contributor uploads plantation photo in Supabase mode -> stores stable cloud key', async () => {
      config.storage.provider = 'supabase';
      config.storage.supabaseUrl = 'https://mockproject.supabase.co';
      config.storage.supabaseServiceRoleKey = 'mock-service-key';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      const res = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .field('species', 'Peepal')
        .field('latitude', '28.6145')
        .field('longitude', '77.2100')
        .field('plantedOn', '2026-09-02')
        .attach('photo', Buffer.from('mock-supabase-tree-image'), 'peepal-evidence.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const tree = res.body.data.tree;
      expect(tree.photoReference).toMatch(/^trees\/tree-\d+-\d+\.png$/);
      createdTreeIds.push(tree.id);

      // Verify the database record stores the stable key (not an expiring URL)
      const dbCheck = await query('SELECT photo_reference FROM trees WHERE id = $1;', [tree.id]);
      expect(dbCheck.rows[0].photo_reference).toBe(tree.photoReference);
    });

    it('API-STOR-03: Contributor can retrieve signed photo URL for their own tree', async () => {
      config.storage.provider = 'supabase';
      config.storage.supabaseUrl = 'https://mockproject.supabase.co';
      config.storage.supabaseServiceRoleKey = 'mock-service-key';

      // Insert tree owned by contributor
      const insertRes = await query(
        `INSERT INTO trees (species, location, photo_reference, status, planted_on, contributor_id)
         VALUES ('Banyan', ST_SetSRID(ST_MakePoint(77.20, 28.60), 4326), 'trees/tree-banyan.jpg', 'Pending', '2026-09-01', $1)
         RETURNING id;`,
        [contributorUser.id]
      );
      const treeId = insertRes.rows[0].id;
      createdTreeIds.push(treeId);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          signedURL: '/storage/v1/object/sign/ecorevive-evidence/trees/tree-banyan.jpg?token=auth_token_contrib',
        }),
      });

      const res = await request(app)
        .get(`/api/v1/trees/${treeId}/photo`)
        .set('Authorization', `Bearer ${contributorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.photoReference).toBe('trees/tree-banyan.jpg');
      expect(res.body.data.photoUrl).toContain('token=auth_token_contrib');
    });

    it('API-STOR-04: Admin can retrieve signed photo URL for verification inspection', async () => {
      config.storage.provider = 'supabase';
      config.storage.supabaseUrl = 'https://mockproject.supabase.co';
      config.storage.supabaseServiceRoleKey = 'mock-service-key';

      const insertRes = await query(
        `INSERT INTO trees (species, location, photo_reference, status, planted_on, contributor_id)
         VALUES ('Arjun', ST_SetSRID(ST_MakePoint(77.21, 28.61), 4326), 'trees/tree-arjun.jpg', 'Pending', '2026-09-01', $1)
         RETURNING id;`,
        [contributorUser.id]
      );
      const treeId = insertRes.rows[0].id;
      createdTreeIds.push(treeId);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          signedURL: '/storage/v1/object/sign/ecorevive-evidence/trees/tree-arjun.jpg?token=auth_token_admin',
        }),
      });

      // Admin accesses via tree route
      const res = await request(app)
        .get(`/api/v1/trees/${treeId}/photo`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.photoUrl).toContain('token=auth_token_admin');

      // Admin accesses via dedicated admin verification route
      const adminRes = await request(app)
        .get(`/api/v1/admin/verifications/${treeId}/photo`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.photoUrl).toContain('token=auth_token_admin');
    });

    it('API-STOR-05: Unauthorized contributor cannot access another user tree photo (403 Forbidden)', async () => {
      const insertRes = await query(
        `INSERT INTO trees (species, location, photo_reference, status, planted_on, contributor_id)
         VALUES ('Mango', ST_SetSRID(ST_MakePoint(77.22, 28.62), 4326), 'trees/tree-mango.jpg', 'Pending', '2026-09-01', $1)
         RETURNING id;`,
        [contributorUser.id]
      );
      const treeId = insertRes.rows[0].id;
      createdTreeIds.push(treeId);

      const res = await request(app)
        .get(`/api/v1/trees/${treeId}/photo`)
        .set('Authorization', `Bearer ${otherContributorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED_PHOTO_ACCESS');
    });

    it('API-STOR-06: Unauthenticated request to view tree photo is rejected (401 Unauthorized)', async () => {
      const res = await request(app).get(`/api/v1/trees/some-id/photo`);
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 3. Health Observation Photos & Privacy
  // =========================================================================
  describe('3. Health Observation Photos & Public Privacy Rules', () => {
    let verifiedTreeId;
    let publicTreeId;

    beforeAll(async () => {
      // Create a verified tree for health observations
      const res = await query(
        `INSERT INTO trees (tree_id, species, location, photo_reference, status, planted_on, contributor_id)
         VALUES ('ER-PLT-77001', 'Jamun', ST_SetSRID(ST_MakePoint(77.23, 28.63), 4326), 'trees/original-proof.jpg', 'Verified', '2026-08-01', $1)
         RETURNING id, tree_id;`,
        [contributorUser.id]
      );
      verifiedTreeId = res.rows[0].id;
      publicTreeId = res.rows[0].tree_id;
      createdTreeIds.push(verifiedTreeId);
    });

    it('API-STOR-07: Caretaker can submit health observation with photo in Supabase mode', async () => {
      config.storage.provider = 'supabase';
      config.storage.supabaseUrl = 'https://mockproject.supabase.co';
      config.storage.supabaseServiceRoleKey = 'mock-service-key';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      const res = await request(app)
        .post(`/api/v1/trees/${publicTreeId}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .field('healthStatus', 'Good')
        .field('notes', 'Healthy new canopy foliage.')
        .attach('photo', Buffer.from('mock-health-photo'), 'health-canopy.jpg');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const healthLog = res.body.data.healthLog;
      expect(healthLog.photoReference).toMatch(/^health\/health-\d+-\d+\.jpg$/);

      // Verify caretaker can fetch signed URL for this health log
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          signedURL: '/storage/v1/object/sign/ecorevive-evidence/health/health-canopy.jpg?token=caretaker_signed_token',
        }),
      });

      const photoRes = await request(app)
        .get(`/api/v1/trees/${publicTreeId}/health-logs/${healthLog.id}/photo`)
        .set('Authorization', `Bearer ${caretakerToken}`);

      expect(photoRes.status).toBe(200);
      expect(photoRes.body.data.photoUrl).toContain('token=caretaker_signed_token');
    });

    it('API-STOR-08: Privacy: Public tree profile strictly excludes original plantation photo', async () => {
      const res = await request(app).get(`/api/v1/public/trees/${publicTreeId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const tree = res.body.data.tree;
      expect(tree.photoReference).toBeUndefined();
      expect(tree.photo_reference).toBeUndefined();
    });

    it('API-STOR-09: Privacy: Public health history does not expose private Supabase storage keys', async () => {
      const res = await request(app).get(`/api/v1/trees/${publicTreeId}/health-logs`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const logs = res.body.data.healthLogs;
      expect(logs.length).toBeGreaterThanOrEqual(1);

      for (const log of logs) {
        // Privacy rule: private Supabase keys (health/...) must be redacted from public view
        if (log.photoReference) {
          expect(log.photoReference).not.toMatch(/^health\//);
          expect(log.photoReference).not.toMatch(/^trees\//);
        }
      }
    });

    it('API-STOR-10: Unauthorized user cannot access health log photo (403 Forbidden)', async () => {
      // Insert health log
      const hlRes = await query(
        `INSERT INTO health_logs (tree_id, submitted_by, health_status, photo_reference, notes)
         VALUES ($1, $2, 'Healthy', 'health/private-observation.jpg', 'Confidential check')
         RETURNING id;`,
        [verifiedTreeId, caretakerUser.id]
      );
      const logId = hlRes.rows[0].id;

      // Other contributor (not owner, not caretaker, not admin)
      const res = await request(app)
        .get(`/api/v1/trees/${publicTreeId}/health-logs/${logId}/photo`)
        .set('Authorization', `Bearer ${otherContributorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('UNAUTHORIZED_PHOTO_ACCESS');
    });

    it('API-STOR-11: Backward compatibility: Legacy photoReference input is stored cleanly', async () => {
      const res = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({
          species: 'Ashoka',
          latitude: 28.6150,
          longitude: 77.2110,
          plantedOn: '2026-09-03',
          photoReference: 'https://archive.example.org/photos/ashoka.jpg',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.tree.photoReference).toBe('https://archive.example.org/photos/ashoka.jpg');
      createdTreeIds.push(res.body.data.tree.id);
    });

    it('API-STOR-12: Unsupported file types are rejected with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .field('species', 'Neem')
        .field('latitude', '28.6139')
        .field('longitude', '77.2090')
        .field('plantedOn', '2026-09-01')
        .attach('photo', Buffer.from('%PDF-1.4 mock pdf'), 'evidence.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    });
  });
});
