const { query } = require('../config/db');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class VerificationRepository {
  /**
   * Retrieves trees for the admin review queue with optional status filter and pagination.
   * @param {object} params
   * @param {string|null} [params.status=null] - Filter by status (e.g. 'Pending', 'Under Review')
   * @param {number} [params.limit=20] - Number of records
   * @param {number} [params.offset=0] - Query offset
   * @returns {Promise<Array<object>>} List of tree records in review queue
   */
  async findReviewQueue({ status = null, limit = 20, offset = 0 } = {}) {
    const params = [];
    let whereClause = '';

    if (status) {
      params.push(status);
      whereClause = 'WHERE t.status = $1';
    }

    const limitParamIndex = params.length + 1;
    const offsetParamIndex = params.length + 2;
    params.push(limit, offset);

    const sql = `
      SELECT
        t.id,
        t.tree_id,
        t.species,
        ST_Y(t.location) AS latitude,
        ST_X(t.location) AS longitude,
        t.photo_reference,
        t.status,
        t.planted_on::text AS planted_on,
        t.contributor_id,
        u.name AS contributor_name,
        u.email AS contributor_email,
        t.created_at,
        t.updated_at
      FROM trees t
      LEFT JOIN users u ON t.contributor_id = u.id
      ${whereClause}
      ORDER BY t.created_at ASC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex};
    `;

    const res = await query(sql, params);
    return res.rows;
  }

  /**
   * Counts the total number of trees matching the review queue filter.
   * @param {object} params
   * @param {string|null} [params.status=null] - Status filter
   * @returns {Promise<number>} Total count
   */
  async countReviewQueue({ status = null } = {}) {
    const params = [];
    let whereClause = '';

    if (status) {
      params.push(status);
      whereClause = 'WHERE status = $1';
    }

    const sql = `SELECT COUNT(*)::int AS total FROM trees ${whereClause};`;
    const res = await query(sql, params);
    return res.rows[0] ? res.rows[0].total : 0;
  }

  /**
   * Finds a tree record by internal UUID or public Tree ID and locks the row FOR UPDATE.
   * @param {import('pg').PoolClient} client - Transactional database client
   * @param {string} treeIdentifier - UUID or Tree ID
   * @returns {Promise<object|null>} Tree record or null
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
   * Updates a tree's status (and optionally tree_id) within a transaction.
   * @param {import('pg').PoolClient} client - Transactional database client
   * @param {string} treeId - Tree UUID
   * @param {string} status - New status ('Under Review', 'Verified', 'Rejected')
   * @param {string|null} [treeIdValue] - Optional Tree ID (e.g. 'ER-PLT-00001')
   * @returns {Promise<object>} Updated tree row
   */
  async updateTreeStatus(client, treeId, status, treeIdValue = undefined) {
    let sql;
    let params;

    if (treeIdValue !== undefined) {
      sql = `
        UPDATE trees
        SET
          status = $1,
          tree_id = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
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
      params = [status, treeIdValue, treeId];
    } else {
      sql = `
        UPDATE trees
        SET
          status = $1,
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
      params = [status, treeId];
    }

    const res = await client.query(sql, params);
    return res.rows[0];
  }

  /**
   * Inserts an audit record into the verifications table within a transaction.
   * @param {import('pg').PoolClient} client - Transactional database client
   * @param {object} auditData
   * @param {string} auditData.treeId - Tree UUID (foreign key to trees.id)
   * @param {string} auditData.reviewerId - Reviewer UUID (foreign key to users.id)
   * @param {string} auditData.decision - Decision ('UNDER_REVIEW', 'VERIFIED', 'REJECTED')
   * @param {string|null} [auditData.reason=null] - Reason/notes
   * @returns {Promise<object>} Created verification audit record
   */
  async createVerificationAudit(client, { treeId, reviewerId, decision, reason = null }) {
    const sql = `
      INSERT INTO verifications (
        tree_id,
        reviewer_id,
        decision,
        reason
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        tree_id,
        reviewer_id,
        decision,
        timestamp,
        reason;
    `;
    const res = await client.query(sql, [treeId, reviewerId, decision, reason]);
    return res.rows[0];
  }

  /**
   * Retrieves all verification audit history records for a specific tree.
   * @param {string} treeId - Tree UUID
   * @returns {Promise<Array<object>>} Chronological audit records
   */
  async findHistoryByTreeId(treeId) {
    const sql = `
      SELECT
        v.id,
        v.tree_id,
        v.reviewer_id,
        u.name AS reviewer_name,
        v.decision,
        v.timestamp,
        v.reason
      FROM verifications v
      LEFT JOIN users u ON v.reviewer_id = u.id
      WHERE v.tree_id = $1
      ORDER BY v.timestamp ASC;
    `;
    const res = await query(sql, [treeId]);
    return res.rows;
  }
}

module.exports = new VerificationRepository();
