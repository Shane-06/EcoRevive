const request = require('supertest');
const app = require('../app');
const { query, closePool } = require('../config/db');
const { signToken } = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');
const treeRepository = require('../repositories/tree.repository');

describe('Milestone 5 — Tree + Plantation Registration & Contributor Endpoints', () => {
  let contributorUser;
  let contributorToken;
  let otherContributorUser;
  let otherContributorToken;
  let adminUser;
  let adminToken;
  let caretakerUser;
  let caretakerToken;

  const createdTreeIds = [];
  const createdUserIds = [];

  beforeAll(async () => {
    // 1. Create primary test contributor
    contributorUser = await userRepository.create({
      name: 'M5 Test Contributor',
      email: `m5-contributor-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'contributor',
    });
    createdUserIds.push(contributorUser.id);
    contributorToken = signToken({ id: contributorUser.id, role: contributorUser.role });

    // 2. Create second contributor for cross-user isolation testing
    otherContributorUser = await userRepository.create({
      name: 'M5 Other Contributor',
      email: `m5-other-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'contributor',
    });
    createdUserIds.push(otherContributorUser.id);
    otherContributorToken = signToken({
      id: otherContributorUser.id,
      role: otherContributorUser.role,
    });

    // 3. Create admin user
    adminUser = await userRepository.create({
      name: 'M5 Admin User',
      email: `m5-admin-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'admin',
    });
    createdUserIds.push(adminUser.id);
    adminToken = signToken({ id: adminUser.id, role: adminUser.role });

    // 4. Create caretaker user
    caretakerUser = await userRepository.create({
      name: 'M5 Caretaker User',
      email: `m5-caretaker-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'caretaker',
    });
    createdUserIds.push(caretakerUser.id);
    caretakerToken = signToken({ id: caretakerUser.id, role: caretakerUser.role });
  });

  afterAll(async () => {
    // Clean up created trees for all test contributors
    for (const userId of createdUserIds) {
      await treeRepository.deleteByContributorId(userId);
    }
    // Clean up created users
    for (const userId of createdUserIds) {
      await userRepository.deleteById(userId);
    }
    await closePool();
  });

  describe('POST /api/v1/trees (Plantation Registration)', () => {
    it('SRS-TREE-01: should successfully register a tree with valid data and return formatted tree record', async () => {
      const payload = {
        species: 'Neem',
        latitude: 30.6543,
        longitude: 76.7821,
        plantedOn: '2026-08-31',
        photoReference: 'https://storage.example.com/trees/photo1.jpg',
      };

      const res = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('tree');

      const { tree } = res.body.data;
      expect(tree).toHaveProperty('id');
      expect(tree.species).toBe('Neem');
      expect(tree.latitude).toBeCloseTo(30.6543, 4);
      expect(tree.longitude).toBeCloseTo(76.7821, 4);
      expect(tree.plantedOn).toBe('2026-08-31');
      expect(tree.photoReference).toBe('https://storage.example.com/trees/photo1.jpg');
      expect(tree.createdAt).toBeDefined();

      createdTreeIds.push(tree.id);
    });

    it('SRS-TREE-02: should strictly assign initial status as Pending', async () => {
      const payload = {
        species: 'Peepal',
        latitude: 28.6139,
        longitude: 77.209,
        plantedOn: '2026-09-01',
      };

      const res = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      const { tree } = res.body.data;
      expect(tree.status).toBe('Pending');
      createdTreeIds.push(tree.id);

      // Verify in DB
      const dbRes = await query('SELECT status FROM trees WHERE id = $1;', [tree.id]);
      expect(dbRes.rows[0].status).toBe('Pending');
    });

    it('Tree ID Rule: tree_id MUST be strictly NULL upon registration', async () => {
      const payload = {
        species: 'Banyan',
        latitude: 19.076,
        longitude: 72.8777,
        plantedOn: '2026-09-02',
      };

      const res = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      const { tree } = res.body.data;
      expect(tree.treeId).toBeNull();
      createdTreeIds.push(tree.id);

      // Verify in DB directly
      const dbRes = await query('SELECT tree_id FROM trees WHERE id = $1;', [tree.id]);
      expect(dbRes.rows[0].tree_id).toBeNull();
    });

    it('SRS-TREE-03 & Security: should automatically bind contributor_id to authenticated user and ignore client-supplied spoofed contributor_id', async () => {
      const fakeContributorId = otherContributorUser.id;
      const payload = {
        species: 'Jamun',
        latitude: 12.9716,
        longitude: 77.5946,
        plantedOn: '2026-09-03',
        contributor_id: fakeContributorId,
        contributorId: fakeContributorId,
      };

      const res = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      const { tree } = res.body.data;
      createdTreeIds.push(tree.id);

      // Verify in DB that it is bound to contributorUser, NOT fakeContributorId
      const dbRes = await query('SELECT contributor_id FROM trees WHERE id = $1;', [tree.id]);
      expect(dbRes.rows[0].contributor_id).toBe(contributorUser.id);
      expect(dbRes.rows[0].contributor_id).not.toBe(fakeContributorId);
    });

    it('Status Security: should prevent client from self-assigning Verified or Under Review status', async () => {
      const payload = {
        species: 'Gulmohar',
        latitude: 13.0827,
        longitude: 80.2707,
        plantedOn: '2026-09-04',
        status: 'Verified',
      };

      const res = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      const { tree } = res.body.data;
      expect(tree.status).toBe('Pending');
      createdTreeIds.push(tree.id);

      const dbRes = await query('SELECT status FROM trees WHERE id = $1;', [tree.id]);
      expect(dbRes.rows[0].status).toBe('Pending');
    });

    it('PostGIS Spatial Storage: should store PostGIS Point geometry with SRID 4326', async () => {
      const lat = 22.5726;
      const lng = 88.3639;
      const payload = {
        species: 'Amla',
        latitude: lat,
        longitude: lng,
        plantedOn: '2026-09-05',
      };

      const res = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      const { tree } = res.body.data;
      createdTreeIds.push(tree.id);

      const dbRes = await query(
        `SELECT
          ST_AsText(location) AS geom_text,
          ST_SRID(location) AS srid,
          ST_X(location) AS x,
          ST_Y(location) AS y
        FROM trees WHERE id = $1;`,
        [tree.id]
      );

      expect(dbRes.rows[0].geom_text).toBe(`POINT(${lng} ${lat})`);
      expect(dbRes.rows[0].srid).toBe(4326);
      expect(parseFloat(dbRes.rows[0].x)).toBeCloseTo(lng, 4);
      expect(parseFloat(dbRes.rows[0].y)).toBeCloseTo(lat, 4);
    });

    it('should reject invalid coordinates (out of range lat/lng) with 400 Bad Request', async () => {
      // Invalid latitude > 90
      const res1 = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({
          species: 'Neem',
          latitude: 95.0,
          longitude: 76.78,
          plantedOn: '2026-08-31',
        });
      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);

      // Invalid longitude > 180
      const res2 = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({
          species: 'Neem',
          latitude: 30.65,
          longitude: 195.0,
          plantedOn: '2026-08-31',
        });
      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);

      // Non-numeric coordinate
      const res3 = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({
          species: 'Neem',
          latitude: 'invalid-lat',
          longitude: 76.78,
          plantedOn: '2026-08-31',
        });
      expect(res3.status).toBe(400);
      expect(res3.body.success).toBe(false);
    });

    it('should reject registration when required fields are missing with 400 Bad Request', async () => {
      // Missing species
      const res1 = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({
          latitude: 30.65,
          longitude: 76.78,
          plantedOn: '2026-08-31',
        });
      expect(res1.status).toBe(400);
      expect(res1.body.error.code).toBe('MISSING_SPECIES');

      // Missing latitude
      const res2 = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({
          species: 'Neem',
          longitude: 76.78,
          plantedOn: '2026-08-31',
        });
      expect(res2.status).toBe(400);

      // Missing planted date
      const res3 = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({
          species: 'Neem',
          latitude: 30.65,
          longitude: 76.78,
        });
      expect(res3.status).toBe(400);
    });

    it('should support multipart/form-data with photo file upload', async () => {
      const buffer = Buffer.from('fake-image-binary-content');

      const res = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${contributorToken}`)
        .field('species', 'Shisham')
        .field('latitude', '31.1048')
        .field('longitude', '77.1734')
        .field('plantedOn', '2026-09-06')
        .attach('photo', buffer, 'evidence.jpg');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const { tree } = res.body.data;
      expect(tree.species).toBe('Shisham');
      expect(tree.photoReference).toMatch(/^uploads\/tree-/);
      createdTreeIds.push(tree.id);
    });

    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/trees')
        .send({
          species: 'Neem',
          latitude: 30.65,
          longitude: 76.78,
          plantedOn: '2026-08-31',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-contributor roles (e.g. admin or caretaker without contributor role) with 403 Forbidden', async () => {
      const resAdmin = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          species: 'Neem',
          latitude: 30.65,
          longitude: 76.78,
          plantedOn: '2026-08-31',
        });
      expect(resAdmin.status).toBe(403);
      expect(resAdmin.body.error.code).toBe('FORBIDDEN');

      const resCaretaker = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${caretakerToken}`)
        .send({
          species: 'Neem',
          latitude: 30.65,
          longitude: 76.78,
          plantedOn: '2026-08-31',
        });
      expect(resCaretaker.status).toBe(403);
      expect(resCaretaker.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/trees/mine (My Plantations)', () => {
    let userATree1Id;
    let userATree2Id;
    let userBTreeId;

    beforeAll(async () => {
      // Register trees for User A (contributorUser)
      const resA1 = await treeRepository.create({
        species: 'Arjun',
        latitude: 25.3176,
        longitude: 82.9739,
        plantedOn: '2026-08-15',
        contributorId: contributorUser.id,
      });
      userATree1Id = resA1.id;
      createdTreeIds.push(userATree1Id);

      const resA2 = await treeRepository.create({
        species: 'Teak',
        latitude: 26.8467,
        longitude: 80.9462,
        plantedOn: '2026-08-20',
        contributorId: contributorUser.id,
      });
      userATree2Id = resA2.id;
      createdTreeIds.push(userATree2Id);

      // Register tree for User B (otherContributorUser)
      const resB = await treeRepository.create({
        species: 'Amaltas',
        latitude: 23.2599,
        longitude: 77.4126,
        plantedOn: '2026-08-25',
        contributorId: otherContributorUser.id,
      });
      userBTreeId = resB.id;
      createdTreeIds.push(userBTreeId);
    });

    it('should return plantations registered by the authenticated contributor with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/trees/mine?page=1&pageSize=10')
        .set('Authorization', `Bearer ${contributorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.trees)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.pageSize).toBe(10);

      // Confirm user A's trees are present
      const returnedIds = res.body.data.trees.map((t) => t.id);
      expect(returnedIds).toContain(userATree1Id);
      expect(returnedIds).toContain(userATree2Id);
    });

    it('Cross-user isolation: User A MUST NOT receive User B records through /mine', async () => {
      const resA = await request(app)
        .get('/api/v1/trees/mine')
        .set('Authorization', `Bearer ${contributorToken}`);

      expect(resA.status).toBe(200);
      const userATreeIds = resA.body.data.trees.map((t) => t.id);
      expect(userATreeIds).not.toContain(userBTreeId);

      // Query as User B and confirm only User B tree is returned
      const resB = await request(app)
        .get('/api/v1/trees/mine')
        .set('Authorization', `Bearer ${otherContributorToken}`);

      expect(resB.status).toBe(200);
      const userBTreeIds = resB.body.data.trees.map((t) => t.id);
      expect(userBTreeIds).toContain(userBTreeId);
      expect(userBTreeIds).not.toContain(userATree1Id);
      expect(userBTreeIds).not.toContain(userATree2Id);
    });

    it('should reject unauthenticated request to /mine with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/trees/mine');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-contributor request to /mine with 403 Forbidden', async () => {
      const resAdmin = await request(app)
        .get('/api/v1/trees/mine')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resAdmin.status).toBe(403);

      const resCaretaker = await request(app)
        .get('/api/v1/trees/mine')
        .set('Authorization', `Bearer ${caretakerToken}`);
      expect(resCaretaker.status).toBe(403);
    });
  });
});
