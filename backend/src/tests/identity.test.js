const request = require('supertest');
const app = require('../app');
const { query, closePool } = require('../config/db');
const userRepository = require('../repositories/user.repository');
const treeRepository = require('../repositories/tree.repository');
const identityService = require('../services/identity.service');
const { signToken } = require('../utils/jwt');
const config = require('../config');

describe('Milestone 10 — Tree ID, QR & Public Tree Profile Integration Tests', () => {
  let adminUser, contributorUser;
  let adminToken;
  const createdUserIds = [];
  const createdTreeIds = [];

  beforeAll(async () => {
    // 1. Create admin user
    adminUser = await userRepository.create({
      name: 'M10 Admin Reviewer',
      email: `m10-admin-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'admin',
    });
    createdUserIds.push(adminUser.id);
    adminToken = signToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role });

    // 2. Create contributor user
    contributorUser = await userRepository.create({
      name: 'M10 Contributor',
      email: `m10-contributor-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'contributor',
    });
    createdUserIds.push(contributorUser.id);
  });

  afterAll(async () => {
    if (createdTreeIds.length > 0) {
      await query('DELETE FROM verifications WHERE tree_id = ANY($1::uuid[]);', [createdTreeIds]);
      await query('DELETE FROM trees WHERE id = ANY($1::uuid[]);', [createdTreeIds]);
    }
    if (createdUserIds.length > 0) {
      await query('DELETE FROM rewards WHERE user_id = ANY($1::uuid[]);', [createdUserIds]);
      await query('DELETE FROM verifications WHERE reviewer_id = ANY($1::uuid[]);', [createdUserIds]);
      await query('DELETE FROM trees WHERE contributor_id = ANY($1::uuid[]);', [createdUserIds]);
      await query('DELETE FROM users WHERE id = ANY($1::uuid[]);', [createdUserIds]);
    }
    await closePool();
  });

  // Helper to create a tree in a specific status
  const createTestTree = async ({
    status = 'Pending',
    treeId = null,
    species = 'Neem',
    lat = 28.6139,
    lng = 77.2090,
  } = {}) => {
    const res = await query(
      `INSERT INTO trees (
        species,
        location,
        photo_reference,
        status,
        planted_on,
        contributor_id,
        tree_id
      )
      VALUES (
        $1,
        ST_SetSRID(ST_MakePoint($2, $3), 4326),
        'uploads/m10-test.jpg',
        $4,
        '2026-08-30',
        $5,
        $6
      )
      RETURNING id, tree_id, species, status, planted_on::text AS planted_on, contributor_id, created_at;`,
      [species, lng, lat, status, contributorUser.id, treeId]
    );
    const tree = res.rows[0];
    createdTreeIds.push(tree.id);
    return tree;
  };

  // =========================================================================
  // 1. Tree ID Eligibility Rules
  // =========================================================================
  describe('1. Tree ID Eligibility & Non-Verified Tree Rules', () => {
    it('ELIG-01: Verified tree receives a permanent Tree ID via M9 approval workflow', async () => {
      // Create Pending tree -> Start Review -> Approve
      const pendingTree = await createTestTree({ status: 'Pending' });

      const startRes = await request(app)
        .patch(`/api/v1/admin/verifications/${pendingTree.id}/start`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(startRes.status).toBe(200);

      const approveRes = await request(app)
        .patch(`/api/v1/admin/verifications/${pendingTree.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.data.tree.status).toBe('Verified');
      expect(approveRes.body.data.tree.treeId).toMatch(/^ER-PLT-\d{5}$/);
      expect(approveRes.body.data.identity.treeId).toBe(approveRes.body.data.tree.treeId);

      // Verify database persistence
      const dbTree = await treeRepository.findById(pendingTree.id);
      expect(dbTree.status).toBe('Verified');
      expect(dbTree.tree_id).toBe(approveRes.body.data.tree.treeId);
    });

    it('ELIG-02: Pending trees must not have or receive a Tree ID', async () => {
      const pendingTree = await createTestTree({ status: 'Pending' });
      expect(pendingTree.tree_id).toBeNull();

      // Attempting direct identity issuance on Pending tree fails with 409 Conflict
      await expect(
        identityService.issueTreeIdentity({
          treeId: pendingTree.id,
          reviewerId: adminUser.id,
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'UNVERIFIED_TREE',
      });

      // Verify database remains null
      const dbTree = await treeRepository.findById(pendingTree.id);
      expect(dbTree.tree_id).toBeNull();
    });

    it('ELIG-03: Under Review trees must not have or receive a Tree ID', async () => {
      const underReviewTree = await createTestTree({ status: 'Under Review' });
      expect(underReviewTree.tree_id).toBeNull();

      // Attempting direct identity issuance on Under Review tree fails with 409 Conflict
      await expect(
        identityService.issueTreeIdentity({
          treeId: underReviewTree.id,
          reviewerId: adminUser.id,
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'UNVERIFIED_TREE',
      });

      const dbTree = await treeRepository.findById(underReviewTree.id);
      expect(dbTree.tree_id).toBeNull();
    });

    it('ELIG-04: Rejected trees must not have or receive a Tree ID', async () => {
      const rejectedTree = await createTestTree({ status: 'Rejected' });
      expect(rejectedTree.tree_id).toBeNull();

      await expect(
        identityService.issueTreeIdentity({
          treeId: rejectedTree.id,
          reviewerId: adminUser.id,
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'UNVERIFIED_TREE',
      });

      const dbTree = await treeRepository.findById(rejectedTree.id);
      expect(dbTree.tree_id).toBeNull();
    });
  });

  // =========================================================================
  // 2. Tree ID Format & Sequential Generation
  // =========================================================================
  describe('2. Tree ID Format & Sequential Generation', () => {
    it('FORMAT-01: Tree ID adheres to ER-PLT-XXXXX format with sequential 5-digit zero-padding', async () => {
      const tree1 = await createTestTree({ status: 'Under Review' });
      const tree2 = await createTestTree({ status: 'Under Review' });

      const res1 = await request(app)
        .patch(`/api/v1/admin/verifications/${tree1.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      const res2 = await request(app)
        .patch(`/api/v1/admin/verifications/${tree2.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      const id1 = res1.body.data.identity.treeId;
      const id2 = res2.body.data.identity.treeId;

      expect(id1).toMatch(/^ER-PLT-\d{5}$/);
      expect(id2).toMatch(/^ER-PLT-\d{5}$/);

      const num1 = parseInt(id1.replace('ER-PLT-', ''), 10);
      const num2 = parseInt(id2.replace('ER-PLT-', ''), 10);
      expect(num2).toBe(num1 + 1);
    });

    it('FORMAT-02: Backend controls Tree ID; client cannot inject or alter authoritative ID', async () => {
      const tree = await createTestTree({ status: 'Under Review' });

      // Attempt to send custom Tree ID in approval body
      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ treeId: 'ER-CUSTOM-99999', tree_id: 'ER-CUSTOM-99999' });

      expect(res.status).toBe(200);
      expect(res.body.data.identity.treeId).not.toBe('ER-CUSTOM-99999');
      expect(res.body.data.identity.treeId).toMatch(/^ER-PLT-\d{5}$/);
    });
  });

  // =========================================================================
  // 3. Database Uniqueness & Concurrency Protection
  // =========================================================================
  describe('3. Database Uniqueness & Concurrency Protection', () => {
    it('UNIQUE-01: Database uniqueness constraint prevents duplicate Tree IDs', async () => {
      const verifiedTree = await createTestTree({ status: 'Verified' });
      const issued = await identityService.issueTreeIdentity({
        treeId: verifiedTree.id,
        reviewerId: adminUser.id,
      });

      const duplicateTree = await createTestTree({ status: 'Verified' });

      // Direct attempt to write the same tree_id in SQL violates uq_trees_tree_id constraint
      await expect(
        query('UPDATE trees SET tree_id = $1 WHERE id = $2;', [issued.treeId, duplicateTree.id])
      ).rejects.toThrow();
    });

    it('CONCUR-01: Concurrent identity operations on the same tree return the exact same Tree ID (Idempotency)', async () => {
      const tree = await createTestTree({ status: 'Verified' });

      // Simulate 5 simultaneous identity issuance requests for the same tree
      const promises = [1, 2, 3, 4, 5].map(() =>
        identityService.issueTreeIdentity({
          treeId: tree.id,
          reviewerId: adminUser.id,
        })
      );

      const results = await Promise.all(promises);
      const firstId = results[0].treeId;
      expect(firstId).toMatch(/^ER-PLT-\d{5}$/);

      // All parallel requests must resolve to the identical Tree ID without conflict
      results.forEach((r) => {
        expect(r.treeId).toBe(firstId);
      });

      // Verify exactly one row in DB with this tree_id
      const countRes = await query('SELECT COUNT(*) FROM trees WHERE tree_id = $1;', [firstId]);
      expect(parseInt(countRes.rows[0].count, 10)).toBe(1);
    });

    it('STABILITY-01: Tree ID remains stable and immutable across repeated reads and operations', async () => {
      const tree = await createTestTree({ status: 'Under Review' });
      const approveRes = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      const originalTreeId = approveRes.body.data.identity.treeId;

      // Re-invoking identity service on already verified tree returns identical ID
      const secondIssue = await identityService.issueTreeIdentity({
        treeId: tree.id,
        reviewerId: adminUser.id,
      });
      expect(secondIssue.treeId).toBe(originalTreeId);

      // Subsequent database read confirms stability
      const dbTree = await treeRepository.findById(tree.id);
      expect(dbTree.tree_id).toBe(originalTreeId);
    });
  });

  // =========================================================================
  // 4. Public Tree Profile API (GET /api/v1/public/trees/:treeId)
  // =========================================================================
  describe('4. Public Tree Profile (GET /api/v1/public/trees/:treeId)', () => {
    it('PUB-01: Public can view privacy-safe profile of a Verified tree using authoritative Tree ID', async () => {
      const tree = await createTestTree({
        status: 'Under Review',
        species: 'Banyan',
        lat: 28.6139,
        lng: 77.2090,
      });

      const approveRes = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      const treeId = approveRes.body.data.identity.treeId;

      // Unauthenticated public request
      const res = await request(app).get(`/api/v1/public/trees/${treeId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tree).toBeDefined();

      const profile = res.body.data.tree;
      expect(profile.treeId).toBe(treeId);
      expect(profile.species).toBe('Banyan');
      expect(profile.plantedOn).toBe('2026-08-30');
      expect(profile.status).toBe('Verified');
      expect(profile.latitude).toBeCloseTo(28.6139, 4);
      expect(profile.longitude).toBeCloseTo(77.2090, 4);
      expect(profile.contributor).toBeDefined();
      expect(profile.contributor.displayName).toBe(contributorUser.name);

      // Health boundary: M10 does not implement health logic; returns null/empty
      expect(profile.currentHealth).toBeNull();
      expect(Array.isArray(profile.healthHistory)).toBe(true);
      expect(profile.healthHistory.length).toBe(0);
    });

    it('PUB-02: Public profile can also be looked up by internal UUID if verified', async () => {
      const tree = await createTestTree({ status: 'Under Review', species: 'Peepal' });
      const approveRes = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      const treeId = approveRes.body.data.identity.treeId;

      const res = await request(app).get(`/api/v1/public/trees/${tree.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.tree.treeId).toBe(treeId);
      expect(res.body.data.tree.species).toBe('Peepal');
    });

    it('PUB-03: Pending trees return 404 Not Found on public endpoint', async () => {
      const pendingTree = await createTestTree({ status: 'Pending' });
      const res = await request(app).get(`/api/v1/public/trees/${pendingTree.id}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TREE_NOT_FOUND');
    });

    it('PUB-04: Under Review trees return 404 Not Found on public endpoint', async () => {
      const underReviewTree = await createTestTree({ status: 'Under Review' });
      const res = await request(app).get(`/api/v1/public/trees/${underReviewTree.id}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TREE_NOT_FOUND');
    });

    it('PUB-05: Rejected trees return 404 Not Found on public endpoint', async () => {
      const rejectedTree = await createTestTree({ status: 'Rejected' });
      const res = await request(app).get(`/api/v1/public/trees/${rejectedTree.id}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TREE_NOT_FOUND');
    });

    it('PUB-06: Non-existent Tree ID returns 404 Not Found', async () => {
      const res = await request(app).get('/api/v1/public/trees/ER-PLT-99999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TREE_NOT_FOUND');
    });
  });

  // =========================================================================
  // 5. Privacy & Data Protection Assertions
  // =========================================================================
  describe('5. Privacy & Data Protection Assertions', () => {
    it('PRIV-01: Public tree profile response strictly excludes private contact and credential fields', async () => {
      const tree = await createTestTree({ status: 'Under Review' });
      const approveRes = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      const treeId = approveRes.body.data.identity.treeId;

      const res = await request(app).get(`/api/v1/public/trees/${treeId}`);
      expect(res.status).toBe(200);

      const rawResponseText = JSON.stringify(res.body);

      // Sensitive fields must never be exposed
      expect(rawResponseText).not.toContain(contributorUser.email);
      expect(rawResponseText).not.toContain('password');
      expect(rawResponseText).not.toContain('password_hash');
      expect(rawResponseText).not.toContain('token');
      expect(rawResponseText).not.toContain('jwt');
      expect(rawResponseText).not.toContain('phone');
      expect(rawResponseText).not.toContain(adminUser.email);
      expect(rawResponseText).not.toContain(adminUser.id);
    });
  });

  // =========================================================================
  // 6. QR Code API (GET /api/v1/public/trees/:treeId/qr)
  // =========================================================================
  describe('6. QR Code & Public Identity Reference (GET /api/v1/public/trees/:treeId/qr)', () => {
    it('QR-01: Public QR endpoint returns canonical treeId, configuration-based profileUrl, and qrDataUrl', async () => {
      const tree = await createTestTree({ status: 'Under Review' });
      const approveRes = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      const treeId = approveRes.body.data.identity.treeId;

      // Public unauthenticated request
      const res = await request(app).get(`/api/v1/public/trees/${treeId}/qr`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const { treeId: resTreeId, profileUrl, qrDataUrl } = res.body.data;
      expect(resTreeId).toBe(treeId);

      // Profile URL must be constructed from configuration host, pointing to public frontend route
      const expectedUrl = `${config.appUrl}/tree/${treeId}`;
      expect(profileUrl).toBe(expectedUrl);

      // qrDataUrl must be a valid PNG Data URL
      expect(qrDataUrl).toBeDefined();
      expect(qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('QR-02: QR endpoint strictly excludes sensitive private data in payload', async () => {
      const tree = await createTestTree({ status: 'Under Review' });
      const approveRes = await request(app)
        .patch(`/api/v1/admin/verifications/${tree.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      const treeId = approveRes.body.data.identity.treeId;

      const res = await request(app).get(`/api/v1/public/trees/${treeId}/qr`);
      const rawText = JSON.stringify(res.body);

      expect(rawText).not.toContain('email');
      expect(rawText).not.toContain('password');
      expect(rawText).not.toContain('jwt');
      expect(rawText).not.toContain('phone');
      expect(rawText).not.toContain('token');
      expect(rawText).not.toContain(contributorUser.email);
    });

    it('QR-03: Non-verified trees return 404 on QR endpoint', async () => {
      const pendingTree = await createTestTree({ status: 'Pending' });
      const res = await request(app).get(`/api/v1/public/trees/${pendingTree.id}/qr`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TREE_NOT_FOUND');
    });

    it('QR-04: Non-existent Tree ID returns 404 on QR endpoint', async () => {
      const res = await request(app).get('/api/v1/public/trees/ER-PLT-88888/qr');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TREE_NOT_FOUND');
    });
  });
});
