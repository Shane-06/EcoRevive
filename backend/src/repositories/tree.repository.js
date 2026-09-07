const { query } = require('../config/db');

/**
 * Tree Repository for database interactions with the trees table.
 */
class TreeRepository {
  /**
   * Inserts a new tree plantation record into the database with PostGIS geometry.
   * @param {object} treeData
   * @param {string} treeData.species - Tree species name
   * @param {number} treeData.latitude - Geographic latitude (-90 to 90)
   * @param {number} treeData.longitude - Geographic longitude (-180 to 180)
   * @param {string} treeData.plantedOn - ISO date string (YYYY-MM-DD)
   * @param {string|null} [treeData.photoReference=null] - Stored photo path or reference
   * @param {string} treeData.contributorId - Contributor user UUID
   * @returns {Promise<object>} Created tree record with extracted coordinates
   */
  async create({ species, latitude, longitude, plantedOn, photoReference = null, contributorId }) {
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
        $1,
        ST_SetSRID(ST_MakePoint($2, $3), 4326),
        $4,
        'Pending',
        $5,
        $6
      )
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
        updated_at;`,
      [species, longitude, latitude, photoReference, plantedOn, contributorId]
    );
    return res.rows[0];
  }

  /**
   * Retrieves all trees registered by a specific contributor with pagination.
   * @param {string} contributorId - Contributor user UUID
   * @param {object} options
   * @param {number} options.limit - Number of records per page
   * @param {number} options.offset - Query offset
   * @returns {Promise<Array<object>>} List of tree records
   */
  async findByContributorId(contributorId, { limit = 20, offset = 0 } = {}) {
    const res = await query(
      `SELECT
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
      WHERE contributor_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;`,
      [contributorId, limit, offset]
    );
    return res.rows;
  }

  /**
   * Counts the total number of trees registered by a specific contributor.
   * @param {string} contributorId - Contributor user UUID
   * @returns {Promise<number>} Total count
   */
  async countByContributorId(contributorId) {
    const res = await query(
      'SELECT COUNT(*)::int AS total FROM trees WHERE contributor_id = $1;',
      [contributorId]
    );
    return res.rows[0] ? res.rows[0].total : 0;
  }

  /**
   * Finds a tree by its internal UUID.
   * @param {string} id - Tree UUID
   * @returns {Promise<object|null>} Tree record or null
   */
  async findById(id) {
    const res = await query(
      `SELECT
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
      WHERE id = $1;`,
      [id]
    );
    return res.rows[0] || null;
  }

  /**
   * Deletes all trees belonging to a contributor (useful for test teardown).
   * @param {string} contributorId - Contributor user UUID
   * @returns {Promise<void>}
   */
  async deleteByContributorId(contributorId) {
    await query('DELETE FROM trees WHERE contributor_id = $1;', [contributorId]);
  }

  /**
   * Deletes a tree by internal UUID (used for test cleanup).
   * @param {string} id - Tree UUID
   * @returns {Promise<void>}
   */
  async deleteById(id) {
    await query('DELETE FROM trees WHERE id = $1;', [id]);
  }
}

module.exports = new TreeRepository();
