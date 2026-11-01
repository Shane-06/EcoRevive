/**
 * EcoRevive V2-M4 — Health Intelligence Repository
 *
 * Implements deterministic, parameterized, single-query partitioned data access
 * for Tree Health Intelligence calculations without N+1 query patterns.
 */

const { query } = require('../config/db');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class HealthIntelligenceRepository {
  /**
   * Retrieves paginated verified trees scoped to the authenticated user.
   *
   * Scoping:
   * - Contributor: trees.contributor_id = user.id AND trees.status = 'Verified'
   * - Caretaker: trees monitored by user (health_logs.submitted_by = user.id) AND trees.status = 'Verified'
   * - Admin: all verified trees
   *
   * @param {object} params
   * @param {object} params.user - { id, role }
   * @param {number} params.limit
   * @param {number} params.offset
   * @returns {Promise<Array<object>>} List of verified tree rows
   */
  async findScopedVerifiedTrees({ user, limit = 20, offset = 0 }) {
    let sql;
    let params;

    if (user.role === 'contributor') {
      sql = `
        SELECT
          t.id,
          t.tree_id,
          t.species,
          t.status,
          t.planted_on::text AS planted_on,
          t.contributor_id,
          t.created_at
        FROM trees t
        WHERE t.contributor_id = $1 AND t.status = 'Verified'
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT $2 OFFSET $3;
      `;
      params = [user.id, limit, offset];
    } else if (user.role === 'caretaker') {
      sql = `
        SELECT DISTINCT
          t.id,
          t.tree_id,
          t.species,
          t.status,
          t.planted_on::text AS planted_on,
          t.contributor_id,
          t.created_at
        FROM trees t
        JOIN health_logs hl ON hl.tree_id = t.id
        WHERE hl.submitted_by = $1 AND t.status = 'Verified'
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT $2 OFFSET $3;
      `;
      params = [user.id, limit, offset];
    } else {
      // Admin: all verified trees
      sql = `
        SELECT
          t.id,
          t.tree_id,
          t.species,
          t.status,
          t.planted_on::text AS planted_on,
          t.contributor_id,
          t.created_at
        FROM trees t
        WHERE t.status = 'Verified'
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT $1 OFFSET $2;
      `;
      params = [limit, offset];
    }

    const res = await query(sql, params);
    return res.rows;
  }

  /**
   * Counts the total number of scoped verified trees for pagination.
   *
   * @param {object} user - { id, role }
   * @returns {Promise<number>} Total count
   */
  async countScopedVerifiedTrees(user) {
    let sql;
    let params;

    if (user.role === 'contributor') {
      sql = `
        SELECT COUNT(*)::int AS total
        FROM trees t
        WHERE t.contributor_id = $1 AND t.status = 'Verified';
      `;
      params = [user.id];
    } else if (user.role === 'caretaker') {
      sql = `
        SELECT COUNT(DISTINCT t.id)::int AS total
        FROM trees t
        JOIN health_logs hl ON hl.tree_id = t.id
        WHERE hl.submitted_by = $1 AND t.status = 'Verified';
      `;
      params = [user.id];
    } else {
      // Admin
      sql = `
        SELECT COUNT(*)::int AS total
        FROM trees t
        WHERE t.status = 'Verified';
      `;
      params = [];
    }

    const res = await query(sql, params);
    return res.rows[0]?.total || 0;
  }

  /**
   * Fetches the latest up to 3 health observations for a list of tree UUIDs
   * using a single partitioned query to strictly avoid N+1 queries.
   *
   * @param {Array<string>} treeUuids
   * @returns {Promise<Array<object>>}
   */
  async findLatestObservationsForTrees(treeUuids) {
    if (!Array.isArray(treeUuids) || treeUuids.length === 0) {
      return [];
    }

    const sql = `
      WITH ranked_logs AS (
        SELECT
          hl.id,
          hl.tree_id,
          hl.health_status,
          hl.recorded_at,
          hl.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY hl.tree_id
            ORDER BY hl.recorded_at DESC, hl.created_at DESC, hl.id DESC
          ) AS rn
        FROM health_logs hl
        WHERE hl.tree_id = ANY($1::uuid[])
      )
      SELECT
        id,
        tree_id,
        health_status,
        recorded_at,
        created_at
      FROM ranked_logs
      WHERE rn <= 3
      ORDER BY tree_id, rn ASC;
    `;

    const res = await query(sql, [treeUuids]);
    return res.rows;
  }

  /**
   * Finds a single verified tree record by UUID or public Tree ID (ER-PLT-XXXXX).
   * Note: Only returns trees with status = 'Verified'.
   *
   * @param {string} treeIdentifier
   * @returns {Promise<object|null>} Tree row or null
   */
  async findVerifiedTreeByIdentifier(treeIdentifier) {
    let sql;
    let params;

    if (UUID_REGEX.test(treeIdentifier)) {
      sql = `
        SELECT
          id,
          tree_id,
          species,
          status,
          planted_on::text AS planted_on,
          contributor_id,
          created_at,
          updated_at
        FROM trees
        WHERE id = $1 AND status = 'Verified';
      `;
      params = [treeIdentifier];
    } else {
      sql = `
        SELECT
          id,
          tree_id,
          species,
          status,
          planted_on::text AS planted_on,
          contributor_id,
          created_at,
          updated_at
        FROM trees
        WHERE tree_id = $1 AND status = 'Verified';
      `;
      params = [treeIdentifier];
    }

    const res = await query(sql, params);
    return res.rows[0] || null;
  }

  /**
   * Retrieves the latest 3 health observation logs for a single tree UUID.
   *
   * @param {string} treeUuid
   * @returns {Promise<Array<object>>} Latest observations in newest-first order
   */
  async findLatestObservationsForTree(treeUuid) {
    const sql = `
      SELECT
        hl.id,
        hl.tree_id,
        hl.health_status,
        hl.recorded_at,
        hl.created_at
      FROM health_logs hl
      WHERE hl.tree_id = $1
      ORDER BY hl.recorded_at DESC, hl.created_at DESC, hl.id DESC
      LIMIT 3;
    `;
    const res = await query(sql, [treeUuid]);
    return res.rows;
  }
}

module.exports = new HealthIntelligenceRepository();
