const request = require('supertest');
const app = require('../app');
const { query, closePool } = require('../config/db');
const userRepository = require('../repositories/user.repository');
const treeRepository = require('../repositories/tree.repository');
const { signToken } = require('../utils/jwt');

describe('Milestone 9 — Manual Verification Workflow Integration Tests', () => {
  let adminUser, contributorUser, caretakerUser;
  let adminToken, contributorToken, caretakerToken;
  const createdUserIds = [];
  const createdTreeIds = [];

  beforeAll(async () => {
    // 1. Create test admin/coordinator user
    adminUser = await userRepository.create({
      name: 'M9 Admin Reviewer',
      email: `m9-admin-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'admin',
    });
    createdUserIds.push(adminUser.id);
    adminToken = signToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role });

    // 2. Create test contributor user
    contributorUser = await userRepository.create({
      name: 'M9 Contributor',
      email: `m9-contributor-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'contributor',
    });
    createdUserIds.push(contributorUser.id);
    contributorToken = signToken({ id: contributorUser.id, email: contributorUser.email, role: contributorUser.role });

    // 3. Create test caretaker user
    caretakerUser = await userRepository.create({
      name: 'M9 Caretaker',
      email: `m9-caretaker-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'caretaker',
    });
    createdUserIds.push(caretakerUser.id);
    caretakerToken = signToken({ id: caretakerUser.id, email: caretakerUser.email, role: caretakerUser.role });
  });

  afterAll(async () => {
    // Clean up created verifications, trees, and users
    if (createdTreeIds.length > 0) {
      await query('DELETE FROM verifications WHERE tree_id = ANY($1::uuid[]);', [createdTreeIds]);
      await query('DELETE FROM trees WHERE id = ANY($1::uuid[]);', [createdTreeIds]);
    }
    if (createdUserIds.length > 0) {
      await query('DELETE FROM users WHERE id = ANY($1::uuid[]);', [createdUserIds]);
    }
    await closePool();
  });

  // Helper to create a fresh pending tree
  const createTestTree = async (status = 'Pending') => {
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
        'Neem',
        ST_SetSRID(ST_MakePoint(77.20, 28.60), 4326),
        'uploads/test-evidence.jpg',
        $1,
        '2026-08-31',
        $2
      )
      RETURNING id, tree_id, species, status, planted_on::text AS planted_on, contributor_id, created_at;`,
      [status, contributorUser.id]
    );
    const tree = res.rows[0];
    createdTreeIds.push(tree.id);
    return tree;
  };

  // =========================================================================
  // 1. Review Queue Tests (GET /api/v1/admin/verifications)
  // =========================================================================
  describe('1. Review Queue (GET /api/v1/admin/verifications)', () => {
    it('QUEUE-01: admin can retrieve review queue with 200 OK and pagination', async () => {
      const tree = await createTestTree('Pending');

      const res = await request(app)
        .get('/api/v1/admin/verifications?page=1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.trees)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.pageSize).toBe(10);
      expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);

      const found = res.body.data.trees.find((t) => t.id === tree.id);
      expect(found).toBeDefined();
      expect(found.species).toBe('Neem');
      expect(found.status).toBe('Pending');
      expect(found.contributor).toBeDefined();
      expect(found.contributor.name).toBe(contributorUser.name);
    });

    it('QUEUE-02: filtering by status=Pending returns only Pending trees', async () => {
      const pendingTree = await createTestTree('Pending');
      const underReviewTree = await createTestTree('Under Review');

      const res = await request(app)
        .get('/api/v1/admin/verifications?status=Pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const statuses = res.body.data.trees.map((t) => t.status);
      expect(statuses.every((s) => s === 'Pending')).toBe(true);

      const foundPending = res.body.data.trees.find((t) => t.id === pendingTree.id);
      expect(foundPending).toBeDefined();
      const foundUnderReview = res.body.data.trees.find((t) => t.id === underReviewTree.id);
      expect(foundUnderReview).toBeUndefined();
    });

    it('QUEUE-03: filtering by status=Under Review returns only Under Review trees', async () => {
      const underReviewTree = await createTestTree('Under Review');

      const res = await request(app)
        .get('/api/v1/admin/verifications?status=Under%20Review')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const statuses = res.body.data.trees.map((t) => t.status);
      expect(statuses.every((s) => s === 'Under Review')).toBe(true);

      const found = res.body.data.trees.find((t) => t.id === underReviewTree.id);
      expect(found).toBeDefined();
    });

    it('QUEUE-04: invalid status filter returns 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/v1/admin/verifications?status=InvalidStatus')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATUS_FILTER');
    });

    it('QUEUE-05: RBAC - unauthorized roles cannot access review queue', async () => {
      // Unauthenticated
      let res = await request(app).get('/api/v1/admin/verifications');
      expect(res.status).toBe(401);

      // Contributor
      res = await request(app)
        .get('/api/v1/admin/verifications')
        .set('Authorization', `Bearer ${contributorToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');

      // Caretaker
      res = await request(app)
        .get('/api/v1/admin/verifications')
        .set('Authorization', `Bearer ${caretakerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // =========================================================================
  // 2. Start Review (PATCH /api/v1/admin/verifications/:treeId/start)
  // =========================================================================
  describe('2. Start Review (PATCH /api/v1/admin/verifications/:treeId/start)', () => {
    it('START-01: valid transition Pending -> Under Review succeeds', async () => {
      const tree = await createTestTree('Pending');

      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/start`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Under Review');

      // Verify database updated
      const dbTree = await treeRepository.findById(tree.id);
      expect(dbTree.status).toBe('Under Review');

      // Verify verification audit entry created
      const auditRes = await query(
        'SELECT * FROM verifications WHERE tree_id = $1 ORDER BY timestamp DESC LIMIT 1;',
        [tree.id]
      );
      expect(auditRes.rows.length).toBe(1);
      expect(auditRes.rows[0].decision).toBe('UNDER_REVIEW');
      expect(auditRes.rows[0].reviewer_id).toBe(adminUser.id);
    });

    it('START-02: invalid transition Under Review -> Under Review returns 409 Conflict', async () => {
      const tree = await createTestTree('Under Review');

      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/start`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('START-03: invalid transition Verified -> Under Review returns 409 Conflict', async () => {
      const tree = await createTestTree('Verified');

      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/start`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('START-04: invalid transition Rejected -> Under Review returns 409 Conflict', async () => {
      const tree = await createTestTree('Rejected');

      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/start`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('START-05: RBAC - contributor, caretaker, and unauthenticated cannot start review', async () => {
      const tree = await createTestTree('Pending');

      // Unauthenticated
      let res = await request(app).patch(`/api/v1/admin/verifications/${tree.id}/start`);
      expect(res.status).toBe(401);

      // Contributor
      res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/start`)
        .set('Authorization', `Bearer ${contributorToken}`);
      expect(res.status).toBe(403);

      // Caretaker
      res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/start`)
        .set('Authorization', `Bearer ${caretakerToken}`);
      expect(res.status).toBe(403);
    });

    it('START-06: non-existent tree returns 404 Not Found', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${fakeUuid}/start`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TREE_NOT_FOUND');
    });
  });

  // =========================================================================
  // 3. Approve Verification (PATCH /api/v1/admin/verifications/:treeId/approve)
  // =========================================================================
  describe('3. Approve Verification (PATCH /api/v1/admin/verifications/:treeId/approve)', () => {
    it('APPROVE-01: valid transition Under Review -> Verified succeeds', async () => {
      const tree = await createTestTree('Under Review');

      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tree.status).toBe('Verified');

      // Verify database updated
      const dbTree = await treeRepository.findById(tree.id);
      expect(dbTree.status).toBe('Verified');
      // M9 boundary: tree_id remains null (not generated until M10)
      expect(dbTree.tree_id).toBeNull();

      // Verify audit record created
      const auditRes = await query(
        'SELECT * FROM verifications WHERE tree_id = $1 AND decision = $2;',
        [tree.id, 'VERIFIED']
      );
      expect(auditRes.rows.length).toBe(1);
      expect(auditRes.rows[0].reviewer_id).toBe(adminUser.id);
      expect(auditRes.rows[0].timestamp).toBeDefined();
    });

    it('APPROVE-02: invalid transition Pending -> Verified returns 409 Conflict', async () => {
      const tree = await createTestTree('Pending');

      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('APPROVE-03: invalid transition Verified -> Verified returns 409 Conflict', async () => {
      const tree = await createTestTree('Verified');

      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('APPROVE-04: invalid transition Rejected -> Verified returns 409 Conflict', async () => {
      const tree = await createTestTree('Rejected');

      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('APPROVE-05: RBAC - contributor, caretaker, and unauthenticated cannot approve', async () => {
      const tree = await createTestTree('Under Review');

      // Contributor cannot approve own or any tree
      let res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${contributorToken}`);
      expect(res.status).toBe(403);

      // Caretaker cannot approve
      res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${caretakerToken}`);
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 4. Reject Verification (PATCH /api/v1/admin/verifications/:treeId/reject)
  // =========================================================================
  describe('4. Reject Verification (PATCH /api/v1/admin/verifications/:treeId/reject)', () => {
    it('REJECT-01: valid transition Under Review -> Rejected with reason succeeds', async () => {
      const tree = await createTestTree('Under Review');

      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Photo evidence is too blurry to identify species.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Rejected');
      expect(res.body.data.reason).toBe('Photo evidence is too blurry to identify species.');

      // Verify database updated
      const dbTree = await treeRepository.findById(tree.id);
      expect(dbTree.status).toBe('Rejected');

      // Verify audit record created
      const auditRes = await query(
        'SELECT * FROM verifications WHERE tree_id = $1 AND decision = $2;',
        [tree.id, 'REJECTED']
      );
      expect(auditRes.rows.length).toBe(1);
      expect(auditRes.rows[0].reviewer_id).toBe(adminUser.id);
      expect(auditRes.rows[0].reason).toBe('Photo evidence is too blurry to identify species.');
      expect(auditRes.rows[0].timestamp).toBeDefined();
    });

    it('REJECT-02: missing rejection reason returns 400/422 Validation Error', async () => {
      const tree = await createTestTree('Under Review');

      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('REJECT-03: blank rejection reason returns 400/422 Validation Error', async () => {
      const tree = await createTestTree('Under Review');

      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('REJECT-04: invalid transition Pending -> Rejected returns 409 Conflict', async () => {
      const tree = await createTestTree('Pending');

      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Premature rejection attempt' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('REJECT-05: invalid transition Verified -> Rejected returns 409 Conflict', async () => {
      const tree = await createTestTree('Verified');

      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Already verified tree rejection' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('REJECT-06: invalid transition Rejected -> Rejected returns 409 Conflict', async () => {
      const tree = await createTestTree('Rejected');

      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Double rejection' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('REJECT-07: RBAC - contributor and caretaker cannot reject', async () => {
      const tree = await createTestTree('Under Review');

      // Contributor
      let res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/reject`)
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({ reason: 'Unauthorized contributor rejection' });
      expect(res.status).toBe(403);

      // Caretaker
      res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/reject`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({ reason: 'Unauthorized caretaker rejection' });
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 5. Complete Lifecycle & Multi-Step Audit History
  // =========================================================================
  describe('5. Full Lifecycle & Audit Persistence (Pending -> Under Review -> Verified)', () => {
    it('LIFECYCLE-01: executes full lifecycle preserving sequential audit records', async () => {
      // 1. Contributor plants tree (Pending)
      const tree = await createTestTree('Pending');

      // 2. Admin starts review (Pending -> Under Review)
      const startRes = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/start`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(startRes.status).toBe(200);

      // 3. Admin approves verification (Under Review -> Verified)
      const approveRes = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(approveRes.status).toBe(200);

      // 4. Verify all sequential audit records exist in verifications table
      const historyRes = await query(
        'SELECT * FROM verifications WHERE tree_id = $1 ORDER BY timestamp ASC;',
        [tree.id]
      );
      expect(historyRes.rows.length).toBe(2);
      expect(historyRes.rows[0].decision).toBe('UNDER_REVIEW');
      expect(historyRes.rows[0].reviewer_id).toBe(adminUser.id);
      expect(historyRes.rows[1].decision).toBe('VERIFIED');
      expect(historyRes.rows[1].reviewer_id).toBe(adminUser.id);
    });

    it('LIFECYCLE-02: executes full lifecycle (Pending -> Under Review -> Rejected) with reason audit', async () => {
      // 1. Contributor plants tree (Pending)
      const tree = await createTestTree('Pending');

      // 2. Admin starts review (Pending -> Under Review)
      await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/start`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 3. Admin rejects verification (Under Review -> Rejected)
      await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Location coordinates do not match plantation site photos.' });

      // 4. Verify audit history
      const historyRes = await query(
        'SELECT * FROM verifications WHERE tree_id = $1 ORDER BY timestamp ASC;',
        [tree.id]
      );
      expect(historyRes.rows.length).toBe(2);
      expect(historyRes.rows[0].decision).toBe('UNDER_REVIEW');
      expect(historyRes.rows[1].decision).toBe('REJECTED');
      expect(historyRes.rows[1].reason).toBe('Location coordinates do not match plantation site photos.');
    });

    it('AUDIT-01: reviewer ID must strictly derive from authenticated JWT and cannot be spoofed', async () => {
      const tree = await createTestTree('Under Review');
      const fakeReviewerId = '11111111-1111-1111-1111-111111111111';

      // Attempt to send a spoofed reviewer_id in request body
      await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reviewer_id: fakeReviewerId, reviewerId: fakeReviewerId });

      const auditRes = await query(
        'SELECT * FROM verifications WHERE tree_id = $1 AND decision = $2;',
        [tree.id, 'VERIFIED']
      );
      expect(auditRes.rows.length).toBe(1);
      // Reviewer ID MUST match the authenticated admin user, not the spoofed body
      expect(auditRes.rows[0].reviewer_id).toBe(adminUser.id);
      expect(auditRes.rows[0].reviewer_id).not.toBe(fakeReviewerId);
    });
  });
});
