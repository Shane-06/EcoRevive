const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../app');
const { query, closePool } = require('../config/db');
const userRepository = require('../repositories/user.repository');
const identityService = require('../services/identity.service');
const { signToken } = require('../utils/jwt');

describe('Milestone 11 — Tree Health Monitoring Backend Integration Tests', () => {
  let adminUser, contributorUser, caretakerUser, otherCaretakerUser;
  let adminToken, contributorToken, caretakerToken;
  const createdUserIds = [];
  const createdTreeIds = [];
  const testFilesToCleanup = [];

  beforeAll(async () => {
    // 1. Create admin user
    adminUser = await userRepository.create({
      name: 'M11 Admin User',
      email: `m11-admin-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'admin',
    });
    createdUserIds.push(adminUser.id);
    adminToken = signToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role });

    // 2. Create contributor user
    contributorUser = await userRepository.create({
      name: 'M11 Contributor User',
      email: `m11-contributor-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'contributor',
    });
    createdUserIds.push(contributorUser.id);
    contributorToken = signToken({ id: contributorUser.id, email: contributorUser.email, role: contributorUser.role });

    // 3. Create caretaker user
    caretakerUser = await userRepository.create({
      name: 'M11 Caretaker User',
      email: `m11-caretaker-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'caretaker',
    });
    createdUserIds.push(caretakerUser.id);
    caretakerToken = signToken({ id: caretakerUser.id, email: caretakerUser.email, role: caretakerUser.role });

    // 4. Create second caretaker user for attribution checks
    otherCaretakerUser = await userRepository.create({
      name: 'M11 Other Caretaker',
      email: `m11-other-caretaker-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'caretaker',
    });
    createdUserIds.push(otherCaretakerUser.id);
  });

  afterAll(async () => {
    // Cleanup health_logs, verifications, trees, users
    if (createdTreeIds.length > 0) {
      await query('DELETE FROM health_logs WHERE tree_id = ANY($1::uuid[]);', [createdTreeIds]);
      await query('DELETE FROM verifications WHERE tree_id = ANY($1::uuid[]);', [createdTreeIds]);
      await query('DELETE FROM trees WHERE id = ANY($1::uuid[]);', [createdTreeIds]);
    }
    if (createdUserIds.length > 0) {
      await query('DELETE FROM users WHERE id = ANY($1::uuid[]);', [createdUserIds]);
    }

    // Clean up test uploaded files
    testFilesToCleanup.forEach((filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (_e) {
        // Ignore file unlink errors
      }
    });

    await closePool();
  });

  // Helper to create and verify a tree with permanent Tree ID
  const createVerifiedTree = async (species = 'Neem') => {
    const res = await query(
      `INSERT INTO trees (
        species,
        location,
        photo_reference,
        status,
        planted_on,
        contributor_id
      )
      VALUES (
        $1,
        ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326),
        'uploads/m11-test.jpg',
        'Verified',
        '2026-08-30',
        $2
      )
      RETURNING id, tree_id, species, status, planted_on::text AS planted_on, contributor_id;`,
      [species, contributorUser.id]
    );
    const tree = res.rows[0];
    createdTreeIds.push(tree.id);

    // Issue permanent Tree ID via M10 identityService
    const issued = await identityService.issueTreeIdentity({
      treeId: tree.id,
      reviewerId: adminUser.id,
    });
    tree.tree_id = issued.treeId;
    return tree;
  };

  // Helper to create an unverified tree (Pending, Under Review, or Rejected)
  const createUnverifiedTree = async (status = 'Pending') => {
    const res = await query(
      `INSERT INTO trees (
        species,
        location,
        photo_reference,
        status,
        planted_on,
        contributor_id
      )
      VALUES (
        'Banyan',
        ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326),
        'uploads/m11-unverified.jpg',
        $1,
        '2026-08-30',
        $2
      )
      RETURNING id, tree_id, species, status, planted_on::text AS planted_on, contributor_id;`,
      [status, contributorUser.id]
    );
    const tree = res.rows[0];
    createdTreeIds.push(tree.id);
    return tree;
  };

  // =========================================================================
  // 1. Health Log Creation (4 Frozen Statuses + Options)
  // =========================================================================
  describe('1. Health Log Creation (POST /api/v1/trees/:treeId/health-logs)', () => {
    it('HLT-01: Caretaker can submit health observation with status "Healthy"', async () => {
      const tree = await createVerifiedTree('Neem');

      const res = await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({
          healthStatus: 'Healthy',
          notes: 'Vigorous leaf growth and strong trunk.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.healthLog).toBeDefined();

      const log = res.body.data.healthLog;
      expect(log.id).toBeDefined();
      expect(log.treeId).toBe(tree.tree_id);
      expect(log.healthStatus).toBe('Healthy');
      expect(log.notes).toBe('Vigorous leaf growth and strong trunk.');
      expect(log.recordedAt).toBeDefined();
      expect(log.submittedBy.id).toBe(caretakerUser.id);
      expect(log.submittedBy.name).toBe(caretakerUser.name);

      // Verify database persistence
      const dbLogs = await query('SELECT * FROM health_logs WHERE id = $1;', [log.id]);
      expect(dbLogs.rows.length).toBe(1);
      expect(dbLogs.rows[0].health_status).toBe('Healthy');
      expect(dbLogs.rows[0].submitted_by).toBe(caretakerUser.id);
    });

    it('HLT-02: Caretaker can submit health observation with status "Good"', async () => {
      const tree = await createVerifiedTree('Peepal');

      const res = await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({
          healthStatus: 'Good',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.healthLog.healthStatus).toBe('Good');
    });

    it('HLT-03: Caretaker can submit health observation with status "Needs Attention"', async () => {
      const tree = await createVerifiedTree('Gulmohar');

      const res = await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({
          healthStatus: 'Needs Attention',
          notes: 'Signs of insect infestation on lower branches.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.healthLog.healthStatus).toBe('Needs Attention');
      expect(res.body.data.healthLog.notes).toBe('Signs of insect infestation on lower branches.');
    });

    it('HLT-04: Caretaker can submit health observation with status "Dead"', async () => {
      const tree = await createVerifiedTree('Mango');

      const res = await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({
          healthStatus: 'Dead',
          notes: 'Sapling dried out completely following severe heatwave.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.healthLog.healthStatus).toBe('Dead');
    });

    it('HLT-05: Caretaker can submit health observation with multipart photo upload', async () => {
      const tree = await createVerifiedTree('Jamun');
      const testImagePath = path.join(__dirname, 'test-health-sample.jpg');
      fs.writeFileSync(testImagePath, 'fake-jpeg-binary-content-for-health-log');
      testFilesToCleanup.push(testImagePath);

      const res = await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .field('healthStatus', 'Healthy')
        .field('notes', 'Photo attached showing canopy.')
        .attach('photo', testImagePath);

      expect(res.status).toBe(201);
      expect(res.body.data.healthLog.photoReference).toBeDefined();
      expect(res.body.data.healthLog.photoReference).toMatch(/uploads\//);
      if (res.body.data.healthLog.photoReference) {
        testFilesToCleanup.push(path.join(__dirname, '..', '..', res.body.data.healthLog.photoReference));
      }
    });

    it('HLT-06: Caretaker can submit health observation with photoReference in JSON', async () => {
      const tree = await createVerifiedTree('Ashoka');

      const res = await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({
          healthStatus: 'Healthy',
          photoReference: 'uploads/existing-photo-key.jpg',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.healthLog.photoReference).toBe('uploads/existing-photo-key.jpg');
    });
  });

  // =========================================================================
  // 2. Validation, Anti-Spoofing & Server-Generated Timestamps
  // =========================================================================
  describe('2. Validation & Server-Generated Timestamps', () => {
    it('VAL-01: Invalid health status rejected with 400 Bad Request', async () => {
      const tree = await createVerifiedTree('Neem');

      const res = await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({ healthStatus: 'Critical' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_HEALTH_STATUS');
    });

    it('VAL-02: Missing health status rejected with 400 Bad Request', async () => {
      const tree = await createVerifiedTree('Neem');

      const res = await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({ notes: 'Only notes without status' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('VAL-03: Notes exceeding 1000 characters rejected with 400 Bad Request', async () => {
      const tree = await createVerifiedTree('Neem');
      const longNotes = 'a'.repeat(1001);

      const res = await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({
          healthStatus: 'Healthy',
          notes: longNotes,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('VAL-04: Server strictly generates recorded_at; client cannot control audit timestamp', async () => {
      const tree = await createVerifiedTree('Neem');
      const spoofedDate = '2020-01-01T00:00:00.000Z';

      const res = await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({
          healthStatus: 'Healthy',
          recordedAt: spoofedDate,
          recorded_at: spoofedDate,
          createdAt: spoofedDate,
        });

      expect(res.status).toBe(201);
      // Server timestamp must be close to current time, ignoring the spoofed 2020 date
      const recordedYear = new Date(res.body.data.healthLog.recordedAt).getFullYear();
      expect(recordedYear).toBeGreaterThanOrEqual(2026);
    });

    it('VAL-05: submitted_by is strictly derived from JWT; client cannot spoof caretaker user', async () => {
      const tree = await createVerifiedTree('Neem');
      const spoofedUserId = otherCaretakerUser.id;

      const res = await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({
          healthStatus: 'Healthy',
          submittedBy: spoofedUserId,
          submitted_by: spoofedUserId,
        });

      expect(res.status).toBe(201);
      // submittedBy must strictly match the authenticated user in JWT, not the spoofed body
      expect(res.body.data.healthLog.submittedBy.id).toBe(caretakerUser.id);
      expect(res.body.data.healthLog.submittedBy.id).not.toBe(spoofedUserId);
    });
  });

  // =========================================================================
  // 3. Authorization & RBAC
  // =========================================================================
  describe('3. Authorization & RBAC', () => {
    it('AUTH-01: Unauthenticated request to create health log rejected with 401 Unauthorized', async () => {
      const tree = await createVerifiedTree('Neem');

      const res = await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .send({ healthStatus: 'Healthy' });

      expect(res.status).toBe(401);
    });

    it('AUTH-02: Contributor role rejected with 403 Forbidden', async () => {
      const tree = await createVerifiedTree('Neem');

      const res = await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({ healthStatus: 'Healthy' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('AUTH-03: Admin role rejected with 403 Forbidden (only caretaker creates health logs)', async () => {
      const tree = await createVerifiedTree('Neem');

      const res = await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ healthStatus: 'Healthy' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // =========================================================================
  // 4. Tree Eligibility Rules
  // =========================================================================
  describe('4. Tree Eligibility Rules', () => {
    it('ELIG-01: Verified tree resolves via public Tree ID (ER-PLT-XXXXX)', async () => {
      const tree = await createVerifiedTree('Neem');

      const res = await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({ healthStatus: 'Healthy' });

      expect(res.status).toBe(201);
      expect(res.body.data.healthLog.treeId).toBe(tree.tree_id);
    });

    it('ELIG-02: Verified tree resolves via internal tree UUID', async () => {
      const tree = await createVerifiedTree('Peepal');

      const res = await request(app)
        .post(`/api/v1/trees/${tree.id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({ healthStatus: 'Good' });

      expect(res.status).toBe(201);
      expect(res.body.data.healthLog.treeId).toBe(tree.tree_id);
    });

    it('ELIG-03: Pending tree rejected with 409 Conflict', async () => {
      const tree = await createUnverifiedTree('Pending');

      const res = await request(app)
        .post(`/api/v1/trees/${tree.id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({ healthStatus: 'Healthy' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNVERIFIED_TREE');
    });

    it('ELIG-04: Under Review tree rejected with 409 Conflict', async () => {
      const tree = await createUnverifiedTree('Under Review');

      const res = await request(app)
        .post(`/api/v1/trees/${tree.id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({ healthStatus: 'Healthy' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNVERIFIED_TREE');
    });

    it('ELIG-05: Rejected tree rejected with 409 Conflict', async () => {
      const tree = await createUnverifiedTree('Rejected');

      const res = await request(app)
        .post(`/api/v1/trees/${tree.id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({ healthStatus: 'Healthy' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNVERIFIED_TREE');
    });

    it('ELIG-06: Verified tree without authoritative Tree ID rejected with 409 Conflict', async () => {
      // Tree in Verified status but tree_id is null
      const res = await query(
        `INSERT INTO trees (species, location, status, planted_on, contributor_id)
         VALUES ('Neem', ST_SetSRID(ST_MakePoint(77.2, 28.6), 4326), 'Verified', '2026-08-30', $1)
         RETURNING id;`,
        [contributorUser.id]
      );
      const treeId = res.rows[0].id;
      createdTreeIds.push(treeId);

      const healthRes = await request(app)
        .post(`/api/v1/trees/${treeId}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({ healthStatus: 'Healthy' });

      expect(healthRes.status).toBe(409);
      expect(healthRes.body.error.code).toBe('UNVERIFIED_TREE');
    });

    it('ELIG-07: Non-existent tree ID returns 404 Not Found', async () => {
      const res = await request(app)
        .post('/api/v1/trees/ER-PLT-99999/health-logs')
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({ healthStatus: 'Healthy' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TREE_NOT_FOUND');
    });
  });

  // =========================================================================
  // 5. Chronological Health History Retrieval
  // =========================================================================
  describe('5. Health History Retrieval (GET /api/v1/trees/:treeId/health-logs)', () => {
    it('HIST-01: Returns paginated health logs in newest-first chronological order', async () => {
      const tree = await createVerifiedTree('Banyan');

      // Create 3 sequential observations
      await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({ healthStatus: 'Good', notes: 'First observation' });

      await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({ healthStatus: 'Healthy', notes: 'Second observation' });

      await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({ healthStatus: 'Needs Attention', notes: 'Third observation' });

      const res = await request(app).get(`/api/v1/trees/${tree.tree_id}/health-logs?page=1&pageSize=10`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.healthLogs.length).toBe(3);
      expect(res.body.data.pagination.total).toBe(3);

      // Newest observation is first
      expect(res.body.data.healthLogs[0].healthStatus).toBe('Needs Attention');
      expect(res.body.data.healthLogs[0].notes).toBe('Third observation');
      expect(res.body.data.healthLogs[2].notes).toBe('First observation');
    });

    it('HIST-02: Tree with zero health logs returns empty array and total 0', async () => {
      const tree = await createVerifiedTree('Neem');

      const res = await request(app).get(`/api/v1/trees/${tree.tree_id}/health-logs`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.healthLogs).toEqual([]);
      expect(res.body.data.pagination.total).toBe(0);
    });

    it('HIST-03: Health history for unverified tree returns 404 Not Found', async () => {
      const tree = await createUnverifiedTree('Pending');

      const res = await request(app).get(`/api/v1/trees/${tree.id}/health-logs`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TREE_NOT_FOUND');
    });

    it('HIST-04: Health history for non-existent tree returns 404 Not Found', async () => {
      const res = await request(app).get('/api/v1/trees/ER-PLT-88888/health-logs');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TREE_NOT_FOUND');
    });
  });

  // =========================================================================
  // 6. Public Profile Integration & Privacy Safeguards
  // =========================================================================
  describe('6. Public Profile Integration & Privacy (GET /api/v1/public/trees/:treeId)', () => {
    it('PUB-01: Public tree profile dynamically reflects currentHealth and healthHistory', async () => {
      const tree = await createVerifiedTree('Gulmohar');

      // Add 2 health logs
      await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({ healthStatus: 'Good', notes: 'Initial health check' });

      await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({ healthStatus: 'Healthy', notes: 'Growing strongly' });

      // Query public tree profile
      const res = await request(app).get(`/api/v1/public/trees/${tree.tree_id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tree.currentHealth).toBe('Healthy');
      expect(res.body.data.tree.healthHistory.length).toBe(2);
      expect(res.body.data.tree.healthHistory[0].healthStatus).toBe('Healthy');
    });

    it('PUB-02: Verified tree with zero health logs has currentHealth null and empty healthHistory', async () => {
      const tree = await createVerifiedTree('Neem');

      const res = await request(app).get(`/api/v1/public/trees/${tree.tree_id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tree.currentHealth).toBeNull();
      expect(res.body.data.tree.healthHistory).toEqual([]);
    });

    it('PUB-03: Missing health log does NOT imply Dead', async () => {
      const tree = await createVerifiedTree('Peepal');

      const res = await request(app).get(`/api/v1/public/trees/${tree.tree_id}`);

      expect(res.status).toBe(200);
      // currentHealth is null, definitely NOT 'Dead'
      expect(res.body.data.tree.currentHealth).not.toBe('Dead');
      expect(res.body.data.tree.currentHealth).toBeNull();
    });

    it('PUB-04: Public health history strictly excludes caretaker private info (user ID, email, credentials)', async () => {
      const tree = await createVerifiedTree('Banyan');

      await request(app)
        .post(`/api/v1/trees/${tree.tree_id}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({ healthStatus: 'Healthy', notes: 'Safe public inspection' });

      const res = await request(app).get(`/api/v1/public/trees/${tree.tree_id}`);
      expect(res.status).toBe(200);

      const rawText = JSON.stringify(res.body);
      expect(rawText).not.toContain(caretakerUser.email);
      expect(rawText).not.toContain(caretakerUser.id);
      expect(rawText).not.toContain('submittedBy');
      expect(rawText).not.toContain('submitted_by');
      expect(rawText).not.toContain('password');
      expect(rawText).not.toContain('jwt');
    });

    it('M10-01: Public QR endpoint continues to function flawlessly alongside health monitoring', async () => {
      const tree = await createVerifiedTree('Ashoka');

      const res = await request(app).get(`/api/v1/public/trees/${tree.tree_id}/qr`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.treeId).toBe(tree.tree_id);
      expect(res.body.data.profileUrl).toBeDefined();
      expect(res.body.data.qrDataUrl).toBeDefined();
    });
  });
});
