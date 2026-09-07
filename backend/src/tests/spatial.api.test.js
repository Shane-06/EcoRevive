const request = require('supertest');
const app = require('../app');
const { query, closePool } = require('../config/db');
const userRepository = require('../repositories/user.repository');
const treeRepository = require('../repositories/tree.repository');

describe('Milestone 6 — Map + Geospatial API Integration Tests', () => {
  let testContributor;
  const createdTreeIds = [];
  const createdUserIds = [];

  // Known test Tree IDs
  const TREE_1_ID = 'ER-M6-001';
  const TREE_2_ID = 'ER-M6-002';
  const TREE_3_ID = 'ER-M6-003';
  const TREE_4_ID = 'ER-M6-004';
  const TREE_REJ_ID = 'ER-M6-REJ';

  beforeAll(async () => {
    // 1. Create a test contributor for tree ownership
    testContributor = await userRepository.create({
      name: 'M6 Spatial Test User',
      email: `m6-spatial-${Date.now()}@ecorevive.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
      role: 'contributor',
    });
    createdUserIds.push(testContributor.id);

    // 2. Insert test trees with precise spatial coordinates around Chandigarh (30.65, 76.78)

    // Tree 1: Verified, In Viewport, ~111m North of Center
    const t1 = await treeRepository.createVerifiedTree({
      treeId: TREE_1_ID,
      species: 'Neem',
      latitude: 30.651,
      longitude: 76.78,
      plantedOn: '2026-08-01',
      contributorId: testContributor.id,
    });
    createdTreeIds.push(t1.id);

    // Tree 2: Verified, In Viewport, ~350m North-East of Center
    const t2 = await treeRepository.createVerifiedTree({
      treeId: TREE_2_ID,
      species: 'Peepal',
      latitude: 30.6525,
      longitude: 76.7825,
      plantedOn: '2026-08-05',
      contributorId: testContributor.id,
    });
    createdTreeIds.push(t2.id);

    // Tree 3: Verified, In Viewport, ~2500m North of Center
    const t3 = await treeRepository.createVerifiedTree({
      treeId: TREE_3_ID,
      species: 'Banyan',
      latitude: 30.6725,
      longitude: 76.785,
      plantedOn: '2026-08-10',
      contributorId: testContributor.id,
    });
    createdTreeIds.push(t3.id);

    // Tree 4: Verified, Outside Viewport (~230km away in Delhi)
    const t4 = await treeRepository.createVerifiedTree({
      treeId: TREE_4_ID,
      species: 'Jamun',
      latitude: 28.6139,
      longitude: 77.209,
      plantedOn: '2026-08-12',
      contributorId: testContributor.id,
    });
    createdTreeIds.push(t4.id);

    // Tree 5: Pending Status, In Viewport, Near Center
    const t5 = await treeRepository.create({
      species: 'Gulmohar',
      latitude: 30.651,
      longitude: 76.78,
      plantedOn: '2026-08-15',
      contributorId: testContributor.id,
    });
    createdTreeIds.push(t5.id);

    // Tree 6: Rejected Status, In Viewport, Near Center
    const resRej = await query(
      `INSERT INTO trees (tree_id, species, location, status, planted_on, contributor_id)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), 'Rejected', $5, $6)
       RETURNING id;`,
      [TREE_REJ_ID, 'Amla', 76.78, 30.651, '2026-08-16', testContributor.id]
    );
    createdTreeIds.push(resRej.rows[0].id);
  });

  afterAll(async () => {
    for (const userId of createdUserIds) {
      await treeRepository.deleteByContributorId(userId);
      await userRepository.deleteById(userId);
    }
    await closePool();
  });

  describe('Coordinate & Query Parameter Validation (SRS-MAP-03)', () => {
    it('should reject /trees/map with missing coordinate parameters (400)', async () => {
      const res = await request(app).get('/api/v1/trees/map?minLat=30.60&minLng=76.70&maxLat=30.70');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MISSING_COORDINATES');
    });

    it('should reject /trees/map with out-of-range coordinates (400)', async () => {
      const res = await request(app).get(
        '/api/v1/trees/map?minLat=-95.0&minLng=76.70&maxLat=30.70&maxLng=76.85'
      );
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_COORDINATES');
    });

    it('should reject /trees/map with inverted bounding box (minLat > maxLat) (400)', async () => {
      const res = await request(app).get(
        '/api/v1/trees/map?minLat=30.70&minLng=76.70&maxLat=30.60&maxLng=76.85'
      );
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_BOUNDS');
    });

    it('should reject /trees/nearby with missing parameters (400)', async () => {
      const res = await request(app).get('/api/v1/trees/nearby?lat=30.65&lng=76.78');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MISSING_RADIUS');
    });

    it('should reject /trees/nearby with negative or zero radius (400)', async () => {
      const res = await request(app).get('/api/v1/trees/nearby?lat=30.65&lng=76.78&radiusMeters=0');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_RADIUS');
    });

    it('should reject /trees/nearby exceeding maximum allowed radius of 50,000m (400)', async () => {
      const res = await request(app).get('/api/v1/trees/nearby?lat=30.65&lng=76.78&radiusMeters=75000');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RADIUS_TOO_LARGE');
    });
  });

  describe('GET /api/v1/trees/map (Map Viewport Query — SRS-MAP-06, SRS-MAP-07)', () => {
    it('should return verified trees inside the bounding box and exclude outside trees', async () => {
      const res = await request(app).get(
        '/api/v1/trees/map?minLat=30.60&minLng=76.70&maxLat=30.70&maxLng=76.85'
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('trees');
      expect(res.body.data).toHaveProperty('pagination');

      const treeIds = res.body.data.trees.map((t) => t.treeId);
      expect(treeIds).toContain(TREE_1_ID);
      expect(treeIds).toContain(TREE_2_ID);
      expect(treeIds).toContain(TREE_3_ID);
      expect(treeIds).not.toContain(TREE_4_ID); // Outside in Delhi
    });

    it('Public Visibility: should strictly exclude Pending and Rejected trees from map viewport', async () => {
      const res = await request(app).get(
        '/api/v1/trees/map?minLat=30.60&minLng=76.70&maxLat=30.70&maxLng=76.85'
      );

      expect(res.status).toBe(200);
      const statuses = res.body.data.trees.map((t) => t.status);
      expect(statuses.every((s) => s === 'Verified')).toBe(true);

      const treeIds = res.body.data.trees.map((t) => t.treeId);
      expect(treeIds).not.toContain(TREE_REJ_ID);
      expect(treeIds).not.toContain(null);
    });

    it('should support pagination and cap pageSize server-side', async () => {
      const res = await request(app).get(
        '/api/v1/trees/map?minLat=30.60&minLng=76.70&maxLat=30.70&maxLng=76.85&page=1&pageSize=2'
      );

      expect(res.status).toBe(200);
      expect(res.body.data.trees.length).toBeLessThanOrEqual(2);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.pageSize).toBe(2);
      expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it('should return empty result for a viewport containing no trees', async () => {
      const res = await request(app).get(
        '/api/v1/trees/map?minLat=-80.0&minLng=-80.0&maxLat=-79.0&maxLng=-79.0'
      );

      expect(res.status).toBe(200);
      expect(res.body.data.trees).toEqual([]);
      expect(res.body.data.pagination.total).toBe(0);
    });
  });

  describe('GET /api/v1/trees/nearby (Proximity Query — SRS-MAP-05, AT-04)', () => {
    it('AT-04: should return trees within search radius and exclude trees beyond radius', async () => {
      // Query with 500m radius around (30.6500, 76.7800)
      const res = await request(app).get(
        '/api/v1/trees/nearby?lat=30.6500&lng=76.7800&radiusMeters=500'
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('trees');

      const treeIds = res.body.data.trees.map((t) => t.treeId);
      // Tree 1 (~111m) and Tree 2 (~350m) are within 500m
      expect(treeIds).toContain(TREE_1_ID);
      expect(treeIds).toContain(TREE_2_ID);

      // Tree 3 (~2500m) and Tree 4 (~230km) must be excluded
      expect(treeIds).not.toContain(TREE_3_ID);
      expect(treeIds).not.toContain(TREE_4_ID);
    });

    it('should calculate accurate distanceMeters in meters and order by distance ascending', async () => {
      const res = await request(app).get(
        '/api/v1/trees/nearby?lat=30.6500&lng=76.7800&radiusMeters=1000'
      );

      expect(res.status).toBe(200);
      const trees = res.body.data.trees;
      expect(trees.length).toBeGreaterThanOrEqual(2);

      const tree1 = trees.find((t) => t.treeId === TREE_1_ID);
      const tree2 = trees.find((t) => t.treeId === TREE_2_ID);

      expect(tree1).toBeDefined();
      expect(tree2).toBeDefined();
      expect(typeof tree1.distanceMeters).toBe('number');
      expect(tree1.distanceMeters).toBeCloseTo(111.2, 0); // ~111m
      expect(tree2.distanceMeters).toBeCloseTo(369.0, -1); // ~350-370m

      // Confirm ascending ordering
      for (let i = 0; i < trees.length - 1; i++) {
        expect(trees[i].distanceMeters).toBeLessThanOrEqual(trees[i + 1].distanceMeters);
      }
    });

    it('Public Visibility: should strictly exclude non-verified trees from nearby results', async () => {
      const res = await request(app).get(
        '/api/v1/trees/nearby?lat=30.6500&lng=76.7800&radiusMeters=1000'
      );

      expect(res.status).toBe(200);
      const treeIds = res.body.data.trees.map((t) => t.treeId);
      expect(treeIds).not.toContain(TREE_REJ_ID);
      expect(treeIds).not.toContain(null);
    });

    it('should return empty array when no trees are within requested radius', async () => {
      const res = await request(app).get(
        '/api/v1/trees/nearby?lat=30.6500&lng=76.7800&radiusMeters=10'
      );

      expect(res.status).toBe(200);
      expect(res.body.data.trees).toEqual([]);
    });
  });

  describe('GET /api/v1/trees/:treeId/location (Tree Location Lookup — AT-03)', () => {
    it('AT-03: should return normalized geographic coordinates for a valid public verified tree', async () => {
      const res = await request(app).get(`/api/v1/trees/${TREE_1_ID}/location`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('treeId', TREE_1_ID);
      expect(res.body.data.latitude).toBeCloseTo(30.651, 3);
      expect(res.body.data.longitude).toBeCloseTo(76.78, 3);
    });

    it('should return 404 Not Found for non-existent public Tree ID', async () => {
      const res = await request(app).get('/api/v1/trees/ER-NONEXISTENT/location');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TREE_NOT_FOUND');
    });

    it('should return 404 Not Found for unverified/rejected Tree ID (privacy boundary)', async () => {
      const res = await request(app).get(`/api/v1/trees/${TREE_REJ_ID}/location`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TREE_NOT_FOUND');
    });
  });

  describe('Privacy Boundary Enforcement', () => {
    it('should never expose sensitive account details across any public spatial response', async () => {
      const [resMap, resNearby, resLocation] = await Promise.all([
        request(app).get('/api/v1/trees/map?minLat=30.60&minLng=76.70&maxLat=30.70&maxLng=76.85'),
        request(app).get('/api/v1/trees/nearby?lat=30.6500&lng=76.7800&radiusMeters=1000'),
        request(app).get(`/api/v1/trees/${TREE_1_ID}/location`),
      ]);

      const payloads = [resMap.body, resNearby.body, resLocation.body];
      for (const p of payloads) {
        const jsonStr = JSON.stringify(p);
        expect(jsonStr).not.toContain('password');
        expect(jsonStr).not.toContain('email');
        expect(jsonStr).not.toContain('password_hash');
        expect(jsonStr).not.toContain('token');
        expect(jsonStr).not.toContain(testContributor.id); // Internal user UUID
      }
    });
  });
});
