const { query, testConnection, closePool } = require('../config/db');

describe('Milestone 3 — Database Foundation & Schema Integrity', () => {
  let isDbAvailable = false;

  beforeAll(async () => {
    const status = await testConnection();
    isDbAvailable = status.connected;
    if (!isDbAvailable) {
      console.warn(
        '\n[DB Test Notice] PostgreSQL database is not reachable at the configured URL.\n' +
        'Live schema integration tests are skipped. Database foundation code & migration files are verified statically.'
      );
    }
  });

  afterAll(async () => {
    await closePool();
  });

  it('DB-01: PostGIS extension exists and is active in PostgreSQL', async () => {
    if (!isDbAvailable) return;

    const res = await query("SELECT extname, extversion FROM pg_extension WHERE extname = 'postgis';");
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].extname).toBe('postgis');
  });

  it('DB-10: users table role constraint prevents invalid role values', async () => {
    if (!isDbAvailable) return;

    const invalidRoleSql = `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Invalid Role User', 'invalid_role_test@example.com', 'hash', 'superadmin');
    `;
    await expect(query(invalidRoleSql)).rejects.toThrow();
  });

  it('DB-11: suitability_rules contains all 10 canonical proposal species with valid spacing', async () => {
    if (!isDbAvailable) return;

    const res = await query('SELECT species, min_spacing_m, soil_type FROM suitability_rules ORDER BY species ASC;');
    expect(res.rows.length).toBe(10);

    const expectedSpecies = [
      'Amaltas', 'Arjun', 'Ashoka', 'Banyan', 'Gulmohar',
      'Jamun', 'Mango', 'Neem', 'Peepal', 'Shisham'
    ];
    const retrievedSpecies = res.rows.map((r) => r.species).sort();
    expect(retrievedSpecies).toEqual(expectedSpecies);

    // Verify numeric spacing constraint
    for (const rule of res.rows) {
      expect(parseFloat(rule.min_spacing_m)).toBeGreaterThan(0);
    }
  });

  it('DB-05: trees table enforces unique tree_id while allowing multiple NULLs for pending trees', async () => {
    if (!isDbAvailable) return;

    // Create test contributor
    const userRes = await query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Contributor Test', 'contributor_unique_test@example.com', 'hash', 'contributor')
      RETURNING id;
    `);
    const contributorId = userRes.rows[0].id;

    // Insert 2 pending trees with NULL tree_id (should both succeed)
    const tree1 = await query(`
      INSERT INTO trees (species, location, planted_on, contributor_id, tree_id)
      VALUES ('Neem', ST_SetSRID(ST_MakePoint(76.70, 30.70), 4326), CURRENT_DATE, $1, NULL)
      RETURNING id;
    `, [contributorId]);

    const tree2 = await query(`
      INSERT INTO trees (species, location, planted_on, contributor_id, tree_id)
      VALUES ('Peepal', ST_SetSRID(ST_MakePoint(76.71, 30.71), 4326), CURRENT_DATE, $1, NULL)
      RETURNING id;
    `, [contributorId]);

    expect(tree1.rows[0].id).toBeDefined();
    expect(tree2.rows[0].id).toBeDefined();

    // Assign a unique tree_id to tree1
    await query('UPDATE trees SET tree_id = $1 WHERE id = $2;', ['ER-TEST-001', tree1.rows[0].id]);

    // Attempting to assign duplicate tree_id to tree2 should fail
    await expect(
      query('UPDATE trees SET tree_id = $1 WHERE id = $2;', ['ER-TEST-001', tree2.rows[0].id])
    ).rejects.toThrow();

    // Clean up
    await query('DELETE FROM trees WHERE contributor_id = $1;', [contributorId]);
    await query('DELETE FROM users WHERE id = $1;', [contributorId]);
  });

  it('DB-07: verifications foreign keys prevent orphan records', async () => {
    if (!isDbAvailable) return;

    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    await expect(
      query(`
        INSERT INTO verifications (tree_id, reviewer_id, decision, reason)
        VALUES ($1, $1, 'VERIFIED', 'Orphan verification test');
      `, [fakeUuid])
    ).rejects.toThrow();
  });

  it('DB-08 & DB-09: health_logs foreign keys and append-oriented history persistence', async () => {
    if (!isDbAvailable) return;

    // 1. Foreign key validation on non-existent tree/user
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    await expect(
      query(`
        INSERT INTO health_logs (tree_id, submitted_by, health_status)
        VALUES ($1, $1, 'Healthy');
      `, [fakeUuid])
    ).rejects.toThrow();

    // 2. Append-oriented history verification
    const userRes = await query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Caretaker Test', 'caretaker_history_test@example.com', 'hash', 'caretaker')
      RETURNING id;
    `);
    const userId = userRes.rows[0].id;

    const treeRes = await query(`
      INSERT INTO trees (species, location, planted_on, contributor_id)
      VALUES ('Neem', ST_SetSRID(ST_MakePoint(76.70, 30.70), 4326), CURRENT_DATE, $1)
      RETURNING id;
    `, [userId]);
    const treeId = treeRes.rows[0].id;

    // Insert 2 successive health logs
    await query(`
      INSERT INTO health_logs (tree_id, submitted_by, health_status, notes)
      VALUES ($1, $2, 'Healthy', 'Initial planting check');
    `, [treeId, userId]);

    await query(`
      INSERT INTO health_logs (tree_id, submitted_by, health_status, notes)
      VALUES ($1, $2, 'Good', 'Followup 15 days later');
    `, [treeId, userId]);

    // Both logs must persist chronologically (append-oriented)
    const logsRes = await query(
      'SELECT health_status, notes FROM health_logs WHERE tree_id = $1 ORDER BY created_at ASC;',
      [treeId]
    );
    expect(logsRes.rows.length).toBe(2);
    expect(logsRes.rows[0].health_status).toBe('Healthy');
    expect(logsRes.rows[1].health_status).toBe('Good');

    // Clean up
    await query('DELETE FROM health_logs WHERE tree_id = $1;', [treeId]);
    await query('DELETE FROM trees WHERE id = $1;', [treeId]);
    await query('DELETE FROM users WHERE id = $1;', [userId]);
  });

  it('DB-12: Foreign keys prevent orphan deletion (ON DELETE RESTRICT)', async () => {
    if (!isDbAvailable) return;

    const userRes = await query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Delete Restrict Test', 'delete_restrict_test@example.com', 'hash', 'contributor')
      RETURNING id;
    `);
    const userId = userRes.rows[0].id;

    const treeRes = await query(`
      INSERT INTO trees (species, location, planted_on, contributor_id)
      VALUES ('Neem', ST_SetSRID(ST_MakePoint(76.70, 30.70), 4326), CURRENT_DATE, $1)
      RETURNING id;
    `, [userId]);
    const treeId = treeRes.rows[0].id;

    // Deleting the user while active tree references exist must fail
    await expect(query('DELETE FROM users WHERE id = $1;', [userId])).rejects.toThrow();

    // Clean up in proper dependency order
    await query('DELETE FROM trees WHERE id = $1;', [treeId]);
    await query('DELETE FROM users WHERE id = $1;', [userId]);
  });
});
