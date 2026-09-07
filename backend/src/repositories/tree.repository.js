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
   * Inserts a verified tree record (used for testing and subsequent milestones).
   * @param {object} treeData
   * @returns {Promise<object>}
   */
  async createVerifiedTree({
    treeId,
    species,
    latitude,
    longitude,
    plantedOn,
    photoReference = null,
    contributorId,
  }) {
    const res = await query(
      `INSERT INTO trees (
        tree_id,
        species,
        location,
        photo_reference,
        status,
        planted_on,
        contributor_id
      )
      VALUES (
        $1,
        $2,
        ST_SetSRID(ST_MakePoint($3, $4), 4326),
        $5,
        'Verified',
        $6,
        $7
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
      [treeId, species, longitude, latitude, photoReference, plantedOn, contributorId]
    );
    return res.rows[0];
  }

  /**
   * Retrieves verified trees within a geographic bounding box envelope.
   * Uses PostGIS GiST index via bounding box operator &&.
   * @param {object} params
   * @param {number} params.minLng - Minimum longitude (West)
   * @param {number} params.minLat - Minimum latitude (South)
   * @param {number} params.maxLng - Maximum longitude (East)
   * @param {number} params.maxLat - Maximum latitude (North)
   * @param {number} params.limit - Records limit
   * @param {number} params.offset - Records offset
   * @returns {Promise<Array<object>>}
   */
  async findInBoundingBox({ minLng, minLat, maxLng, maxLat, limit = 50, offset = 0 }) {
    const res = await query(
      `SELECT
        tree_id AS "treeId",
        species,
        ST_Y(location) AS latitude,
        ST_X(location) AS longitude,
        status
      FROM trees
      WHERE status = 'Verified'
        AND location && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      ORDER BY created_at DESC
      LIMIT $5 OFFSET $6;`,
      [minLng, minLat, maxLng, maxLat, limit, offset]
    );
    return res.rows;
  }

  /**
   * Counts verified trees within a geographic bounding box envelope.
   * @param {object} params
   * @returns {Promise<number>}
   */
  async countInBoundingBox({ minLng, minLat, maxLng, maxLat }) {
    const res = await query(
      `SELECT COUNT(*)::int AS total
      FROM trees
      WHERE status = 'Verified'
        AND location && ST_MakeEnvelope($1, $2, $3, $4, 4326);`,
      [minLng, minLat, maxLng, maxLat]
    );
    return res.rows[0] ? res.rows[0].total : 0;
  }

  /**
   * Finds verified trees within radius in meters using PostGIS ST_DWithin on geography.
   * @param {object} params
   * @param {number} params.longitude - Center longitude
   * @param {number} params.latitude - Center latitude
   * @param {number} params.radiusMeters - Search radius in meters
   * @returns {Promise<Array<object>>}
   */
  async findNearby({ longitude, latitude, radiusMeters }) {
    const res = await query(
      `SELECT
        tree_id AS "treeId",
        species,
        ST_Y(location) AS latitude,
        ST_X(location) AS longitude,
        ROUND(ST_Distance(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 1)::float AS "distanceMeters",
        status
      FROM trees
      WHERE status = 'Verified'
        AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      ORDER BY "distanceMeters" ASC;`,
      [longitude, latitude, radiusMeters]
    );
    return res.rows;
  }

  /**
   * Looks up the geographic location of a single public verified tree by public Tree ID.
   * @param {string} treeId - Public Tree ID
   * @returns {Promise<object|null>}
   */
  async findLocationByTreeId(treeId) {
    const res = await query(
      `SELECT
        tree_id AS "treeId",
        ST_Y(location) AS latitude,
        ST_X(location) AS longitude
      FROM trees
      WHERE tree_id = $1 AND status = 'Verified';`,
      [treeId]
    );
    return res.rows[0] || null;
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
