const request = require('supertest');
const app = require('../app');
const { query, closePool } = require('../config/db');
const userRepository = require('../repositories/user.repository');
const rewardRepository = require('../repositories/reward.repository');
const { signToken } = require('../utils/jwt');

describe('Milestone 12 — Rewards Backend Integration Tests', () => {
  let adminUser, contributor1, contributor2, caretakerUser;
  let adminToken, contributor1Token, contributor2Token, caretakerToken;
  const createdUserIds = [];
  const createdTreeIds = [];

  beforeAll(async () => {
    // 1. Create admin user
    adminUser = await userRepository.create({
      name: 'M12 Admin Reviewer',
      email: `m12-admin-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'admin',
    });
    createdUserIds.push(adminUser.id);
    adminToken = signToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role });

    // 2. Create contributor 1
    contributor1 = await userRepository.create({
      name: 'M12 Contributor 1',
      email: `m12-contrib1-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'contributor',
    });
    createdUserIds.push(contributor1.id);
    contributor1Token = signToken({ id: contributor1.id, email: contributor1.email, role: contributor1.role });

    // 3. Create contributor 2
    contributor2 = await userRepository.create({
      name: 'M12 Contributor 2',
      email: `m12-contrib2-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'contributor',
    });
    createdUserIds.push(contributor2.id);
    contributor2Token = signToken({ id: contributor2.id, email: contributor2.email, role: contributor2.role });

    // 4. Create caretaker user
    caretakerUser = await userRepository.create({
      name: 'M12 Caretaker',
      email: `m12-caretaker-${Date.now()}@ecorevive.test`,
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

  // Helper to create tree record
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
        'Neem',
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

  describe('1. Activity-Based Reward Rules & Points Allocation', () => {
    it('should award exactly 50 points to contributor upon verification approval', async () => {
      const tree = await createTestTree(contributor1.id, 'Pending');

      // Admin starts review: Pending -> Under Review
      await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify points before approval is 0
      const initialPoints = await rewardRepository.getTotalPointsByUserId(contributor1.id);

      // Admin approves verification: Under Review -> Verified
      const approveRes = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.data.tree.status).toBe('Verified');

      // Contributor should now have +50 points
      const updatedPoints = await rewardRepository.getTotalPointsByUserId(contributor1.id);
      expect(updatedPoints).toBe(initialPoints + 50);

      // Verify reward event record
      const rewards = await rewardRepository.findRewardsByUserId({ userId: contributor1.id });
      const latestReward = rewards[0];
      expect(latestReward.points).toBe(50);
      expect(latestReward.activity).toBe('Verified plantation');
    });

    it('should NOT award points when a plantation is registered (Pending status)', async () => {
      const initialPoints = await rewardRepository.getTotalPointsByUserId(contributor2.id);

      const res = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributor2Token}`)
        .send({
          species: 'Peepal',
          latitude: 28.6139,
          longitude: 77.2090,
          plantedOn: '2026-08-31',
        })
        .expect(201);

      createdTreeIds.push(res.body.data.id);

      const updatedPoints = await rewardRepository.getTotalPointsByUserId(contributor2.id);
      expect(updatedPoints).toBe(initialPoints);
    });

    it('should NOT award points when a plantation is moved to Under Review', async () => {
      const tree = await createTestTree(contributor2.id, 'Pending');
      const initialPoints = await rewardRepository.getTotalPointsByUserId(contributor2.id);

      await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const updatedPoints = await rewardRepository.getTotalPointsByUserId(contributor2.id);
      expect(updatedPoints).toBe(initialPoints);
    });

    it('should NOT award points when a plantation is Rejected', async () => {
      const tree = await createTestTree(contributor2.id, 'Under Review');
      const initialPoints = await rewardRepository.getTotalPointsByUserId(contributor2.id);

      await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Photo unclear' })
        .expect(200);

      const updatedPoints = await rewardRepository.getTotalPointsByUserId(contributor2.id);
      expect(updatedPoints).toBe(initialPoints);
    });

    it('should NOT award points to the admin reviewer performing the approval', async () => {
      const adminPoints = await rewardRepository.getTotalPointsByUserId(adminUser.id);
      expect(adminPoints).toBe(0);
    });

    it('should NOT award points to caretakers submitting health logs', async () => {
      // 1. Setup a verified tree with Tree ID
      const tree = await createTestTree(contributor1.id, 'Under Review');
      const approveRes = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const treeIdentifier = approveRes.body.data.identity.treeId;
      const initialCaretakerPoints = await rewardRepository.getTotalPointsByUserId(caretakerUser.id);

      // 2. Caretaker submits a health log
      const healthRes = await request(app)
        .post(`/api/v1/trees/${treeIdentifier}/health-logs`)
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({
          healthStatus: 'Healthy',
          notes: 'Sapling thriving with new green shoots',
        })
        .expect(201);

      expect(healthRes.body.success).toBe(true);

      // Caretaker points should remain 0
      const updatedCaretakerPoints = await rewardRepository.getTotalPointsByUserId(caretakerUser.id);
      expect(updatedCaretakerPoints).toBe(initialCaretakerPoints);
    });
  });

  describe('2. User Rewards Retrieval API (GET /api/v1/rewards/me)', () => {
    it('should retrieve authenticated user rewards with correct totalPoints and activities', async () => {
      const res = await request(app)
        .get('/api/v1/rewards/me')
        .set('Authorization', `Bearer ${contributor1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.totalPoints).toBe('number');
      expect(res.body.data.totalPoints).toBeGreaterThanOrEqual(50);
      expect(Array.isArray(res.body.data.activities)).toBe(true);
      expect(res.body.data.activities.length).toBeGreaterThan(0);

      const firstActivity = res.body.data.activities[0];
      expect(firstActivity).toHaveProperty('id');
      expect(firstActivity).toHaveProperty('activity', 'Verified plantation');
      expect(firstActivity).toHaveProperty('points', 50);
      expect(firstActivity).toHaveProperty('createdAt');

      // Check pagination metadata
      expect(res.body.data).toHaveProperty('pagination');
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.pageSize).toBe(20);
      expect(typeof res.body.data.pagination.total).toBe('number');
      expect(typeof res.body.data.pagination.totalPages).toBe('number');
    });

    it('should return 0 points and empty activities array for user with no rewards', async () => {
      // Caretaker has no reward events
      const res = await request(app)
        .get('/api/v1/rewards/me')
        .set('Authorization', `Bearer ${caretakerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalPoints).toBe(0);
      expect(res.body.data.activities).toEqual([]);
      expect(res.body.data.pagination.total).toBe(0);
      expect(res.body.data.pagination.totalPages).toBe(1);
    });

    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/v1/rewards/me')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should strictly isolate user data (User A cannot see User B rewards)', async () => {
      const res1 = await request(app)
        .get('/api/v1/rewards/me')
        .set('Authorization', `Bearer ${contributor1Token}`)
        .expect(200);

      const res2 = await request(app)
        .get('/api/v1/rewards/me')
        .set('Authorization', `Bearer ${contributor2Token}`)
        .expect(200);

      expect(res1.body.data.totalPoints).not.toBe(res2.body.data.totalPoints);
    });
  });

  describe('3. Pagination Validation (Deterministic 400 INVALID_PAGINATION)', () => {
    it('should reject page < 1 with 400 INVALID_PAGINATION', async () => {
      const res = await request(app)
        .get('/api/v1/rewards/me?page=0')
        .set('Authorization', `Bearer ${contributor1Token}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_PAGINATION');
    });

    it('should reject negative page with 400 INVALID_PAGINATION', async () => {
      const res = await request(app)
        .get('/api/v1/rewards/me?page=-5')
        .set('Authorization', `Bearer ${contributor1Token}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_PAGINATION');
    });

    it('should reject non-integer page with 400 INVALID_PAGINATION', async () => {
      const res = await request(app)
        .get('/api/v1/rewards/me?page=abc')
        .set('Authorization', `Bearer ${contributor1Token}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_PAGINATION');
    });

    it('should reject pageSize > 100 with 400 INVALID_PAGINATION', async () => {
      const res = await request(app)
        .get('/api/v1/rewards/me?pageSize=101')
        .set('Authorization', `Bearer ${contributor1Token}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_PAGINATION');
    });

    it('should reject pageSize < 1 with 400 INVALID_PAGINATION', async () => {
      const res = await request(app)
        .get('/api/v1/rewards/me?pageSize=0')
        .set('Authorization', `Bearer ${contributor1Token}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_PAGINATION');
    });

    it('should reject non-integer pageSize with 400 INVALID_PAGINATION', async () => {
      const res = await request(app)
        .get('/api/v1/rewards/me?pageSize=invalid')
        .set('Authorization', `Bearer ${contributor1Token}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_PAGINATION');
    });

    it('should support valid custom pagination (page=1, pageSize=1)', async () => {
      const res = await request(app)
        .get('/api/v1/rewards/me?page=1&pageSize=1')
        .set('Authorization', `Bearer ${contributor1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.activities.length).toBeLessThanOrEqual(1);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.pageSize).toBe(1);
    });
  });
});
