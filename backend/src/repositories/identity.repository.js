const { query } = require('../config/db');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADVISORY_LOCK_ID = 7331; // Deterministic advisory lock identifier for Tree ID generation

class IdentityRepository {
  /**
   * Generates the next sequential, zero-padded Tree ID (ER-PLT-XXXXX) within an atomic transaction.
   * Uses PostgreSQL advisory transactional lock to prevent race conditions during concurrent issuance.
   * @param {import('pg').PoolClient} client - Transactional database client
   * @returns {Promise<string>} Next authoritative Tree ID (e.g. 'ER-PLT-00001')
   */
  async getNextTreeId(client) {
    // Acquire transaction-scoped advisory lock
    await client.query('SELECT pg_advisory_xact_lock($1);', [ADVISORY_LOCK_ID]);

    const sql = `
      SELECT tree_id
      FROM trees
      WHERE tree_id ~ '^ER-PLT-[0-9]+$'
      ORDER BY regexp_replace(tree_id, '^ER-PLT-', '')::bigint DESC
      LIMIT 1;
    `;

    const res = await client.query(sql);
    let nextNum = 1;

    if (res.rows.length > 0 && res.rows[0].tree_id) {
      const match = res.rows[0].tree_id.match(/^ER-PLT-([0-9]+)$/);
      if (match && match[1]) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    const paddedNum = String(nextNum).padStart(5, '0');
    return `ER-PLT-${paddedNum}`;
  }

  /**
   * Finds a tree by UUID or Tree ID with row-level lock FOR UPDATE.
   * @param {import('pg').PoolClient} client - Transactional database client
   * @param {string} treeIdentifier - Tree UUID or Tree ID
   * @returns {Promise<object|null>} Tree row or null
   */
  async findTreeForUpdate(client, treeIdentifier) {
    const isUuid = UUID_REGEX.test(treeIdentifier);
    const sql = isUuid
      ? `
        SELECT
          id,
          tree_id,
          species,
          ST_Y(location) AS latitude,
          ST_X(location) AS longitude,
          photo_reference,
          status,
          planted_on::text AS planted_on,
          contributor_id,
          created_at,
          updated_at
        FROM trees
        WHERE id = $1
        FOR UPDATE;
      `
      : `
        SELECT
          id,
          tree_id,
          species,
          ST_Y(location) AS latitude,
          ST_X(location) AS longitude,
          photo_reference,
          status,
          planted_on::text AS planted_on,
          contributor_id,
          created_at,
          updated_at
        FROM trees
        WHERE tree_id = $1
        FOR UPDATE;
      `;

    const res = await client.query(sql, [treeIdentifier]);
    return res.rows[0] || null;
  }

  /**
   * Assigns an authoritative Tree ID to a tree record within a transaction.
   * @param {import('pg').PoolClient} client - Transactional database client
   * @param {string} treeUuid - Tree UUID
   * @param {string} treeId - Authoritative Tree ID (e.g. 'ER-PLT-00001')
   * @returns {Promise<object>} Updated tree row
   */
  async assignTreeId(client, treeUuid, treeId) {
    const sql = `
      UPDATE trees
      SET
        tree_id = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING
        id,
        tree_id,
        species,
        ST_Y(location) AS latitude,
        ST_X(location) AS longitude,
        photo_reference,
        status,
        planted_on::text AS planted_on,
        contributor_id,
        created_at,
        updated_at;
    `;
    const res = await client.query(sql, [treeId, treeUuid]);
    return res.rows[0];
  }

  /**
   * Retrieves a verified public tree profile by Tree ID or UUID.
   * Only returns records with status = 'Verified'.
   * @param {string} treeIdentifier - Public Tree ID or UUID
   * @returns {Promise<object|null>} Public tree record or null
   */
  async findPublicTreeProfile(treeIdentifier) {
    const isUuid = UUID_REGEX.test(treeIdentifier);
    const sql = isUuid
      ? `
        SELECT
          t.id,
          t.tree_id,
          t.species,
          ST_Y(t.location) AS latitude,
          ST_X(t.location) AS longitude,
          t.photo_reference,
          t.status,
          t.planted_on::text AS planted_on,
          t.created_at,
          u.name AS contributor_display_name
        FROM trees t
        LEFT JOIN users u ON t.contributor_id = u.id
        WHERE t.id = $1 AND t.status = 'Verified';
      `
      : `
        SELECT
          t.id,
          t.tree_id,
          t.species,
          ST_Y(t.location) AS latitude,
          ST_X(t.location) AS longitude,
          t.photo_reference,
          t.status,
          t.planted_on::text AS planted_on,
          t.created_at,
          u.name AS contributor_display_name
        FROM trees t
        LEFT JOIN users u ON t.contributor_id = u.id
        WHERE t.tree_id = $1 AND t.status = 'Verified';
      `;

    const res = await query(sql, [treeIdentifier]);
    return res.rows[0] || null;
  }
}

module.exports = new IdentityRepository();
