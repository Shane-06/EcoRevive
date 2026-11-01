/**
 * EcoRevive V2-M4 — Integration Test Suite: Tree Health Intelligence API & Tool
 *
 * Covers:
 * - Scoped collection endpoint GET /api/v1/health-intelligence
 * - Single-tree endpoint GET /api/v1/health-intelligence/trees/:treeId
 * - RBAC matrix: Contributor, Caretaker, Admin
 * - Cross-user isolation and non-disclosure for unverified/nonexistent trees
 * - Data minimization: exclusion of contributorId, user UUIDs, notes, coordinates
 * - EcoGuide getTreeHealthInsight tool execution
 */

const request = require('supertest');
const app = require('../app');
const { query, closePool } = require('../config/db');
const { signToken } = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');
const treeRepository = require('../repositories/tree.repository');
const toolExecutorService = require('../services/ai/toolExecutor.service');

describe('V2-M4: Tree Health Intelligence — API & Tool Integration Tests', () => {
  let contributorA;
  let tokenA;
  let contributorB;
  let tokenB;
  let caretaker;
  let tokenCaretaker;
  let admin;
  let tokenAdmin;

  let verifiedTreeA;
  let pendingTreeA;
  let verifiedTreeB;

  const createdUserIds = [];
  const createdTreeIds = [];

  beforeAll(async () => {
    const randA = Math.floor(70000 + Math.random() * 10000);
    const randB = Math.floor(80000 + Math.random() * 10000);
    const publicTreeIdA = `ER-PLT-${randA}`;
    const publicTreeIdB = `ER-PLT-${randB}`;

    // 1. Create Contributor A
    contributorA = await userRepository.create({
      name: 'Contributor Alice',
      email: `alice-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'contributor',
    });
    createdUserIds.push(contributorA.id);
    tokenA = signToken({ id: contributorA.id, role: contributorA.role });

    // 2. Create Contributor B
    contributorB = await userRepository.create({
      name: 'Contributor Bob',
      email: `bob-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'contributor',
    });
    createdUserIds.push(contributorB.id);
    tokenB = signToken({ id: contributorB.id, role: contributorB.role });

    // 3. Create Caretaker
    caretaker = await userRepository.create({
      name: 'Caretaker Charlie',
      email: `charlie-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'caretaker',
    });
    createdUserIds.push(caretaker.id);
    tokenCaretaker = signToken({ id: caretaker.id, role: caretaker.role });

    // 4. Create Admin
    admin = await userRepository.create({
      name: 'Admin Diana',
      email: `diana-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'admin',
    });
    createdUserIds.push(admin.id);
    tokenAdmin = signToken({ id: admin.id, role: admin.role });

    // 5. Create Verified Tree for Contributor A
    verifiedTreeA = await treeRepository.create({
      contributorId: contributorA.id,
      species: 'Neem (Azadirachta indica)',
      latitude: 12.9716,
      longitude: 77.5946,
      plantedOn: '2026-03-01',
    });
    createdTreeIds.push(verifiedTreeA.id);
    await query(
      `UPDATE trees SET status = 'Verified', tree_id = $1 WHERE id = $2`,
      [publicTreeIdA, verifiedTreeA.id]
    );
    verifiedTreeA.tree_id = publicTreeIdA;
    verifiedTreeA.status = 'Verified';

    // 6. Create Pending Tree for Contributor A
    pendingTreeA = await treeRepository.create({
      contributorId: contributorA.id,
      species: 'Banyan (Ficus benghalensis)',
      latitude: 12.9720,
      longitude: 77.5950,
      plantedOn: '2026-04-01',
    });
    createdTreeIds.push(pendingTreeA.id);

    // 7. Create Verified Tree for Contributor B
    verifiedTreeB = await treeRepository.create({
      contributorId: contributorB.id,
      species: 'Peepal (Ficus religiosa)',
      latitude: 12.9730,
      longitude: 77.5960,
      plantedOn: '2026-05-01',
    });
    createdTreeIds.push(verifiedTreeB.id);
    await query(
      `UPDATE trees SET status = 'Verified', tree_id = $1 WHERE id = $2`,
      [publicTreeIdB, verifiedTreeB.id]
    );
    verifiedTreeB.tree_id = publicTreeIdB;
    verifiedTreeB.status = 'Verified';

    // 8. Add health logs to verifiedTreeA (Healthy -> Good -> Needs Attention => worsening)
    await query(
      `INSERT INTO health_logs (tree_id, submitted_by, health_status, recorded_at, created_at)
       VALUES
       ($1, $2, 'Healthy', '2026-08-01 10:00:00+00', '2026-08-01 10:00:00+00'),
       ($1, $2, 'Good', '2026-08-15 10:00:00+00', '2026-08-15 10:00:00+00'),
       ($1, $2, 'Needs Attention', '2026-09-01 10:00:00+00', '2026-09-01 10:00:00+00')`,
      [verifiedTreeA.id, caretaker.id]
    );
  });

  afterAll(async () => {
    // Cleanup created test records
    if (createdTreeIds.length > 0) {
      await query(`DELETE FROM health_logs WHERE tree_id = ANY($1::uuid[])`, [createdTreeIds]);
      await query(`DELETE FROM trees WHERE id = ANY($1::uuid[])`, [createdTreeIds]);
    }
    if (createdUserIds.length > 0) {
      await query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [createdUserIds]);
    }
    await closePool();
  });

  describe('GET /api/v1/health-intelligence (Collection)', () => {
    test('Requires authentication (returns 401 without token)', async () => {
      const res = await request(app).get('/api/v1/health-intelligence');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('Contributor A only sees their own verified trees', async () => {
      const res = await request(app)
        .get('/api/v1/health-intelligence')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.insights).toBeDefined();

      const treeIds = res.body.data.insights.map(i => i.treeId);
      expect(treeIds).toContain(verifiedTreeA.tree_id);
      expect(treeIds).not.toContain(verifiedTreeB.tree_id);
      expect(treeIds).not.toContain(pendingTreeA.id);

      // Verify structure of insight item
      const item = res.body.data.insights.find(i => i.treeId === verifiedTreeA.tree_id);
      expect(item).toMatchObject({
        treeId: verifiedTreeA.tree_id,
        species: 'Neem (Azadirachta indica)',
        latestStatus: 'Needs Attention',
        trend: 'worsening',
        evidenceCount: 3,
        recommendation: expect.any(String),
      });

      // Data minimization check: no private caretaker notes, contributor_id, or coordinates
      expect(item.contributor_id).toBeUndefined();
      expect(item.contributorId).toBeUndefined();
      expect(item.notes).toBeUndefined();
      expect(item.location).toBeUndefined();
    });

    test('Caretaker only sees verified trees they have actively monitored', async () => {
      const res = await request(app)
        .get('/api/v1/health-intelligence')
        .set('Authorization', `Bearer ${tokenCaretaker}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const treeIds = res.body.data.insights.map(i => i.treeId);
      expect(treeIds).toContain(verifiedTreeA.tree_id);
      // verifiedTreeB has no health logs by caretaker Charlie
      expect(treeIds).not.toContain(verifiedTreeB.tree_id);
    });

    test('Admin sees all verified trees platform-wide', async () => {
      const res = await request(app)
        .get('/api/v1/health-intelligence')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const treeIds = res.body.data.insights.map(i => i.treeId);
      expect(treeIds).toContain(verifiedTreeA.tree_id);
      expect(treeIds).toContain(verifiedTreeB.tree_id);
      expect(treeIds).not.toContain(pendingTreeA.id);
    });

    test('Pagination parameters are respected and bounded', async () => {
      const res = await request(app)
        .get('/api/v1/health-intelligence?page=1&pageSize=1')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.data.insights.length).toBeLessThanOrEqual(1);
      expect(res.body.data.pagination).toMatchObject({
        page: 1,
        pageSize: 1,
      });
    });
  });

  describe('GET /api/v1/health-intelligence/trees/:treeId (Single Tree)', () => {
    test('Requires authentication', async () => {
      const res = await request(app).get(`/api/v1/health-intelligence/trees/${verifiedTreeA.tree_id}`);
      expect(res.status).toBe(401);
    });

    test('Contributor A can view their own verified tree with evidence and explanation', async () => {
      // With now = 2026-09-05T10:00:00Z (4 days after 2026-09-01), monitoring is up-to-date and worsening recommendation triggers
      const res = await request(app)
        .get(`/api/v1/health-intelligence/trees/${verifiedTreeA.tree_id}?now=2026-09-05T10:00:00Z`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        treeId: verifiedTreeA.tree_id,
        species: 'Neem (Azadirachta indica)',
        latestStatus: 'Needs Attention',
        trend: 'worsening',
        monitoring: {
          status: 'up_to_date',
          intervalDays: 30,
          daysSinceLastObservation: 4,
        },
        explanation: expect.stringContaining('worsening'),
        recommendation: 'Review the latest observations and arrange an appropriate follow-up inspection.',
      });

      // Check evidence array
      expect(Array.isArray(res.body.data.evidence)).toBe(true);
      expect(res.body.data.evidence.length).toBe(3);
      expect(res.body.data.evidence[0]).toHaveProperty('id');
      expect(res.body.data.evidence[0]).toHaveProperty('status');
      expect(res.body.data.evidence[0]).toHaveProperty('observedAt');

      // Privacy: no notes or user ids
      expect(res.body.data.evidence[0].notes).toBeUndefined();
      expect(res.body.data.contributorId).toBeUndefined();

      // Without 'now' override (more than 30 days elapsed), monitoring is overdue and prompts for updated observation
      const resOverdue = await request(app)
        .get(`/api/v1/health-intelligence/trees/${verifiedTreeA.tree_id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(resOverdue.body.data.monitoring.status).toBe('overdue');
      expect(resOverdue.body.data.recommendation).toBe(
        'Record an updated observation through the existing monitoring workflow.'
      );
    });

    test('Contributor A receives 404 when requesting Contributor B verified tree (cross-user isolation)', async () => {
      const res = await request(app)
        .get(`/api/v1/health-intelligence/trees/${verifiedTreeB.tree_id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TREE_NOT_FOUND');

      // Verify that the tree IS accessible to its true owner (Contributor B)
      const resOwner = await request(app)
        .get(`/api/v1/health-intelligence/trees/${verifiedTreeB.tree_id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(resOwner.status).toBe(200);
      expect(resOwner.body.data.treeId).toBe(verifiedTreeB.tree_id);
    });

    test('Caretaker and Admin can view any verified tree insight', async () => {
      const resCaretaker = await request(app)
        .get(`/api/v1/health-intelligence/trees/${verifiedTreeB.tree_id}`)
        .set('Authorization', `Bearer ${tokenCaretaker}`);
      expect(resCaretaker.status).toBe(200);

      const resAdmin = await request(app)
        .get(`/api/v1/health-intelligence/trees/${verifiedTreeB.tree_id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(resAdmin.status).toBe(200);
    });

    test('Non-disclosure: Unverified (Pending) tree returns 404 even to its owner', async () => {
      const res = await request(app)
        .get(`/api/v1/health-intelligence/trees/${pendingTreeA.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TREE_NOT_FOUND');
    });

    test('Non-existent tree ID returns 404', async () => {
      const res = await request(app)
        .get('/api/v1/health-intelligence/trees/ER-PLT-99999')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TREE_NOT_FOUND');
    });
  });

  describe('EcoGuide Tool: getTreeHealthInsight', () => {
    test('Tool executes and returns deterministic health insight with source attribution', async () => {
      const result = await toolExecutorService.executeTool(
        'getTreeHealthInsight',
        { treeId: verifiedTreeA.tree_id },
        { id: contributorA.id, role: contributorA.role }
      );

      expect(result.success).toBe(true);
      expect(result.data.found).toBe(true);
      expect(result.data.trend).toBe('worsening');
      expect(result.data.treeId).toBe(verifiedTreeA.tree_id);
      expect(result.sourceAttribution).toMatchObject({
        type: 'health_insight',
        title: 'Tree Health Intelligence Record',
        tool: 'getTreeHealthInsight',
        entityId: verifiedTreeA.tree_id,
      });
    });

    test('Tool returns found: false for unauthorized tree', async () => {
      const result = await toolExecutorService.executeTool(
        'getTreeHealthInsight',
        { treeId: verifiedTreeB.tree_id },
        { id: contributorA.id, role: contributorA.role }
      );

      expect(result.success).toBe(true);
      expect(result.data.found).toBe(false);
      expect(result.sourceAttribution.type).toBe('health_insight');
    });
  });
});
