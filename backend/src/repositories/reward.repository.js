const { query } = require('../config/db');

class RewardRepository {
  /**
   * Inserts an immutable reward event record.
   * Can be executed within an existing transaction by passing the client.
   * @param {import('pg').PoolClient|null} client - Optional transactional client
   * @param {object} params
   * @param {string} params.userId - User UUID
   * @param {number} params.points - Awarded points (integer)
   * @param {string} params.activity - Activity description (e.g. 'Verified plantation')
   * @returns {Promise<object>} Created reward row
   */
  async createReward(client, { userId, points, activity }) {
    const sql = `
      INSERT INTO rewards (
        user_id,
        points,
        activity,
        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        CURRENT_TIMESTAMP
      )
      RETURNING id, user_id, points, activity, created_at AS "createdAt";
    `;
    const params = [userId, points, activity];

    if (client) {
      const res = await client.query(sql, params);
      return res.rows[0];
    }

    const res = await query(sql, params);
    return res.rows[0];
  }

  /**
   * Computes the total reward points accumulated by a specific user.
   * @param {string} userId - User UUID
   * @returns {Promise<number>} Total reward points (defaults to 0)
   */
  async getTotalPointsByUserId(userId) {
    const sql = `
      SELECT COALESCE(SUM(points), 0)::int AS "totalPoints"
      FROM rewards
      WHERE user_id = $1;
    `;
    const res = await query(sql, [userId]);
    return res.rows[0]?.totalPoints || 0;
  }

  /**
   * Retrieves paginated reward history records for a user in newest-first order.
   * @param {object} params
   * @param {string} params.userId - User UUID
   * @param {number} [params.limit=20]
   * @param {number} [params.offset=0]
   * @returns {Promise<Array<object>>} List of reward events
   */
  async findRewardsByUserId({ userId, limit = 20, offset = 0 }) {
    const sql = `
      SELECT
        id,
        user_id AS "userId",
        points,
        activity,
        created_at AS "createdAt"
      FROM rewards
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2 OFFSET $3;
    `;
    const res = await query(sql, [userId, limit, offset]);
    return res.rows;
  }

  /**
   * Counts the total number of reward event records for a user.
   * @param {string} userId - User UUID
   * @returns {Promise<number>} Total count
   */
  async countRewardsByUserId(userId) {
    const sql = `
      SELECT COUNT(*)::int AS total
      FROM rewards
      WHERE user_id = $1;
    `;
    const res = await query(sql, [userId]);
    return res.rows[0]?.total || 0;
  }

  /**
   * Computes the system-wide sum of all reward points issued across all users.
   * @returns {Promise<number>} Total points issued
   */
  async getTotalPointsIssued() {
    const sql = `
      SELECT COALESCE(SUM(points), 0)::int AS "totalPointsIssued"
      FROM rewards;
    `;
    const res = await query(sql);
    return res.rows[0]?.totalPointsIssued || 0;
  }
}

module.exports = new RewardRepository();
