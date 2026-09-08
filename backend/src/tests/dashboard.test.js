const request = require('supertest');
const app = require('../app');
const { query, closePool } = require('../config/db');
const userRepository = require('../repositories/user.repository');
const { signToken } = require('../utils/jwt');

describe('Milestone 12 — Dashboard Aggregation Backend Integration Tests', () => {
  let adminUser, contributor1, contributor2, caretakerUser;
  let adminToken, contributor1Token, contributor2Token, caretakerToken;
  const createdUserIds = [];
  const createdTreeIds = [];

  beforeAll(async () => {
    // 1. Create admin user
    adminUser = await userRepository.create({
      name: 'M12 Dashboard Admin',
      email: `m12-dash-admin-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'admin',
    });
    createdUserIds.push(adminUser.id);
    adminToken = signToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role });

    // 2. Create contributor 1
    contributor1 = await userRepository.create({
      name: 'M12 Dashboard Contributor 1',
      email: `m12-dash-contrib1-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'contributor',
    });
    createdUserIds.push(contributor1.id);
    contributor1Token = signToken({ id: contributor1.id, email: contributor1.email, role: contributor1.role });

    // 3. Create contributor 2
    contributor2 = await userRepository.create({
      name: 'M12 Dashboard Contributor 2',
      email: `m12-dash-contrib2-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'contributor',
    });
    createdUserIds.push(contributor2.id);
    contributor2Token = signToken({ id: contributor2.id, email: contributor2.email, role: contributor2.role });

    // 4. Create caretaker user
    caretakerUser = await userRepository.create({
      name: 'M12 Dashboard Caretaker',
      email: `m12-dash-caretaker-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'caretaker',
    });
    createdUserIds.push(caretakerUser.id);
    caretakerToken = signToken({ id: caretakerUser.id, email: caretakerUser.email, role: caretakerUser.role });
  });

  afterAll(async () => {
    // Clean up created records
    if (createdTreeIds.length > 0) {
      await query('DELETE FROM health_logs WHERE tree_id = ANY($1::uuid[]);', [createdTreeIds]);
      await query('DELETE FROM verifications WHERE tree_id = ANY($1::uuid[]);', [createdTreeIds]);
      await query('DELETE FROM trees WHERE id = ANY($1::uuid[]);', [createdTreeIds]);
    }
    if (createdUserIds.length > 0) {
      await query('DELETE FROM health_logs WHERE submitted_by = ANY($1::uuid[]);', [createdUserIds]);
      await query('DELETE FROM rewards WHERE user_id = ANY($1::uuid[]);', [createdUserIds]);
      await query('DELETE FROM verifications WHERE reviewer_id = ANY($1::uuid[]);', [createdUserIds]);
      await query('DELETE FROM trees WHERE contributor_id = ANY($1::uuid[]);', [createdUserIds]);
      await query('DELETE FROM users WHERE id = ANY($1::uuid[]);', [createdUserIds]);
    }
    await closePool();
  });

  // Helper to create tree record directly with specific status
  const createTestTree = async (contributorId, status = 'Pending') => {
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
        'Gulmohar',
        ST_SetSRID(ST_MakePoint(77.20, 28.60), 4326),
        'uploads/test-evidence.jpg',
        $1,
        '2026-08-31',
        $2
      )
      RETURNING id, tree_id, species, status, contributor_id;`,
      [status, contributorId]
    );
    const tree = res.rows[0];
    createdTreeIds.push(tree.id);
    return tree;
  };

  // Helper to add health log directly
  const addHealthLog = async (treeId, submittedBy, healthStatus = 'Healthy') => {
    const res = await query(
      `INSERT INTO health_logs (
        tree_id,
        submitted_by,
        health_status,
        notes,
        recorded_at,
        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        'Test log',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING id, tree_id, health_status;`,
      [treeId, submittedBy, healthStatus]
    );
    return res.rows[0];
  };

  describe('1. Admin Dashboard Aggregations (GET /api/v1/admin/dashboard)', () => {
    it('should aggregate accurate plantation status breakdown, health logs count, and points', async () => {
      // Create a controlled set of trees
      await createTestTree(contributor1.id, 'Pending');
      await createTestTree(contributor1.id, 'Under Review');
      await createTestTree(contributor1.id, 'Rejected');
      const treeVerified1 = await createTestTree(contributor1.id, 'Under Review');
      const treeVerified2 = await createTestTree(contributor2.id, 'Under Review');

      // Approve treeVerified1 and treeVerified2 via admin verification endpoint
      await request(app)
        .patch(`/api/v1/admin/verifications/${treeVerified1.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app)
        .patch(`/api/v1/admin/verifications/${treeVerified2.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Add 2 health logs for treeVerified1 (tests distinct counting)
      await addHealthLog(treeVerified1.id, caretakerUser.id, 'Healthy');
      await addHealthLog(treeVerified1.id, caretakerUser.id, 'Good');

      // Fetch admin dashboard
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const { plantations, health, rewards } = res.body.data;

      // Plantations counts
      expect(plantations.total).toBeGreaterThanOrEqual(5);
      expect(plantations.verified).toBeGreaterThanOrEqual(2);
      expect(plantations.pending).toBeGreaterThanOrEqual(1);
      expect(plantations.underReview).toBeGreaterThanOrEqual(1);
      expect(plantations.rejected).toBeGreaterThanOrEqual(1);

      // Total must equal sum of individual statuses
      expect(plantations.total).toBe(
        plantations.verified + plantations.pending + plantations.underReview + plantations.rejected
      );

      // Health logs distinct count: treeVerified1 has 2 logs, counts as 1 distinct monitored tree
      expect(health.treesWithHealthLogs).toBeGreaterThanOrEqual(1);

      // Rewards sum: each verified tree awarded 50 points
      expect(rewards.totalPointsIssued).toBeGreaterThanOrEqual(100);
    });

    it('should reject non-admin access to /admin/dashboard with 403 Forbidden', async () => {
      // Contributor attempt
      const resContrib = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${contributor1Token}`)
        .expect(403);

      expect(resContrib.body.success).toBe(false);
      expect(resContrib.body.error.code).toBe('FORBIDDEN');

      // Caretaker attempt
      const resCaretaker = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${caretakerToken}`)
        .expect(403);

      expect(resCaretaker.body.success).toBe(false);
      expect(resCaretaker.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject unauthenticated access with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('2. Contributor Dashboard (GET /api/v1/dashboard/me)', () => {
    it('should return strictly the authenticated contributor’s plantation breakdown, health status, and rewards', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/me')
        .set('Authorization', `Bearer ${contributor1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const { plantations, health, rewards } = res.body.data;

      // Verification of contributor 1 statistics
      expect(plantations).toHaveProperty('total');
      expect(plantations).toHaveProperty('verified');
      expect(plantations).toHaveProperty('pending');
      expect(plantations).toHaveProperty('underReview');
      expect(plantations).toHaveProperty('rejected');

      expect(health).toHaveProperty('monitoredTrees');
      expect(typeof health.monitoredTrees).toBe('number');

      expect(rewards).toHaveProperty('totalPoints');
      expect(rewards).toHaveProperty('recentActivities');
      expect(Array.isArray(rewards.recentActivities)).toBe(true);

      if (rewards.recentActivities.length > 0) {
        expect(rewards.recentActivities[0]).toHaveProperty('id');
        expect(rewards.recentActivities[0]).toHaveProperty('activity');
        expect(rewards.recentActivities[0]).toHaveProperty('points');
        expect(rewards.recentActivities[0]).toHaveProperty('createdAt');
      }
    });

    it('should isolate dashboard data between different contributors', async () => {
      const res1 = await request(app)
        .get('/api/v1/dashboard/me')
        .set('Authorization', `Bearer ${contributor1Token}`)
        .expect(200);

      const res2 = await request(app)
        .get('/api/v1/dashboard/me')
        .set('Authorization', `Bearer ${contributor2Token}`)
        .expect(200);

      // Contributor 1 and Contributor 2 have different trees
      expect(res1.body.data.plantations.total).not.toBe(res2.body.data.plantations.total);
    });

    it('should return valid zeroed structure for user with zero plantations', async () => {
      // Caretaker user has zero plantations registered
      const res = await request(app)
        .get('/api/v1/dashboard/me')
        .set('Authorization', `Bearer ${caretakerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.plantations).toEqual({
        total: 0,
        verified: 0,
        pending: 0,
        underReview: 0,
        rejected: 0,
      });
      expect(res.body.data.health.monitoredTrees).toBe(0);
      expect(res.body.data.rewards.totalPoints).toBe(0);
      expect(res.body.data.rewards.recentActivities).toEqual([]);
    });

    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/me')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });
});
