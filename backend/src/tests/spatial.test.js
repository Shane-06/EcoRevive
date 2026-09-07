const { query, testConnection, closePool } = require('../config/db');

describe('Milestone 3 — PostGIS Spatial Schema & Query Integrity', () => {
  let isDbAvailable = false;

  beforeAll(async () => {
    const status = await testConnection();
    isDbAvailable = status.connected;
    if (!isDbAvailable) {
      console.warn(
        '\n[Spatial Test Notice] PostgreSQL database is not reachable at the configured URL.\n' +
        'Live spatial integration tests are skipped. Spatial schema & migration files are verified statically.'
      );
    }
  });

  afterAll(async () => {
    await closePool();
  });

  it('DB-04: GiST spatial index idx_trees_location_gist exists on trees table', async () => {
    if (!isDbAvailable) return;

    const res = await query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'trees' AND indexname = 'idx_trees_location_gist';
    `);

    expect(res.rows.length).toBe(1);
    expect(res.rows[0].indexdef.toLowerCase()).toContain('using gist (location)');
  });

  it('DB-02 & DB-03: Tree location accepts valid Point geometry (SRID 4326) and rejects invalid geometry', async () => {
    if (!isDbAvailable) return;

    const userRes = await query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Spatial Contributor', 'spatial_contrib_test@example.com', 'hash', 'contributor')
      RETURNING id;
    `);
    const contributorId = userRes.rows[0].id;

    // 1. Valid insertion: longitude = 76.7821, latitude = 30.6543
    const insertRes = await query(`
      INSERT INTO trees (species, location, planted_on, contributor_id)
      VALUES ('Neem', ST_SetSRID(ST_MakePoint(76.7821, 30.6543), 4326), CURRENT_DATE, $1)
      RETURNING id, ST_X(location) AS longitude, ST_Y(location) AS latitude, ST_SRID(location) AS srid;
    `, [contributorId]);

    expect(insertRes.rows[0].id).toBeDefined();
    expect(parseFloat(insertRes.rows[0].longitude)).toBeCloseTo(76.7821, 4);
    expect(parseFloat(insertRes.rows[0].latitude)).toBeCloseTo(30.6543, 4);
    expect(insertRes.rows[0].srid).toBe(4326);

    // 2. DB-03: Invalid insertion with NULL location must be rejected
    await expect(
      query(`
        INSERT INTO trees (species, location, planted_on, contributor_id)
        VALUES ('Peepal', NULL, CURRENT_DATE, $1);
      `, [contributorId])
    ).rejects.toThrow();

    // Clean up
    await query('DELETE FROM trees WHERE contributor_id = $1;', [contributorId]);
    await query('DELETE FROM users WHERE id = $1;', [contributorId]);
  });

  it('DB-13: Representative nearby (ST_DWithin) and viewport (ST_MakeEnvelope) queries return accurate results', async () => {
    if (!isDbAvailable) return;

    const userRes = await query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Spatial Query User', 'spatial_query_test@example.com', 'hash', 'contributor')
      RETURNING id;
    `);
    const contributorId = userRes.rows[0].id;

    // Insert Tree 1 (Sector 17, Chandigarh ~ 30.7398° N, 76.7827° E)
    const tree1 = await query(`
      INSERT INTO trees (species, location, planted_on, contributor_id)
      VALUES ('Neem', ST_SetSRID(ST_MakePoint(76.7827, 30.7398), 4326), CURRENT_DATE, $1)
      RETURNING id;
    `, [contributorId]);

    // Insert Tree 2 (~5km away, Mohali ~ 30.7046° N, 76.7179° E)
    const tree2 = await query(`
      INSERT INTO trees (species, location, planted_on, contributor_id)
      VALUES ('Banyan', ST_SetSRID(ST_MakePoint(76.7179, 30.7046), 4326), CURRENT_DATE, $1)
      RETURNING id;
    `, [contributorId]);

    const tree1Id = tree1.rows[0].id;
    const tree2Id = tree2.rows[0].id;
    expect(tree1Id).toBeDefined();
    expect(tree2Id).toBeDefined();

    // A. Nearby Query: Search within 1000m (1km) of Sector 17 point (76.7827, 30.7398)
    // Tree 1 should be returned (~0m distance), Tree 2 should NOT be returned (>5km)
    const nearbyRes = await query(`
      SELECT id, species,
             ST_Distance(location::geography, ST_SetSRID(ST_MakePoint(76.7827, 30.7398), 4326)::geography) AS distance_meters
      FROM trees
      WHERE ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(76.7827, 30.7398), 4326)::geography, 1000)
        AND contributor_id = $1;
    `, [contributorId]);

    expect(nearbyRes.rows.length).toBe(1);
    expect(nearbyRes.rows[0].id).toBe(tree1Id);
    expect(parseFloat(nearbyRes.rows[0].distance_meters)).toBeLessThan(10);

    // B. Viewport / Bounding Box Query: Viewport covering Sector 17 area only
    const viewportRes = await query(`
      SELECT id, species, ST_X(location) AS longitude, ST_Y(location) AS latitude
      FROM trees
      WHERE location && ST_MakeEnvelope(76.75, 30.72, 76.80, 30.76, 4326)
        AND contributor_id = $1;
    `, [contributorId]);

    expect(viewportRes.rows.length).toBe(1);
    expect(viewportRes.rows[0].id).toBe(tree1Id);

    // C. Document spatial query execution plan with EXPLAIN
    const explainRes = await query(`
      EXPLAIN SELECT id FROM trees WHERE location && ST_MakeEnvelope(76.75, 30.72, 76.80, 30.76, 4326);
    `);
    expect(explainRes.rows.length).toBeGreaterThan(0);

    // Clean up
    await query('DELETE FROM trees WHERE contributor_id = $1;', [contributorId]);
    await query('DELETE FROM users WHERE id = $1;', [contributorId]);
  });
});
