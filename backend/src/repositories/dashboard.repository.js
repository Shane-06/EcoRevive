const { query } = require('../config/db');

class DashboardRepository {
  /**
   * Aggregates system-wide metrics for the coordinator/admin dashboard.
   * Executes single-pass SQL aggregations in PostgreSQL.
   * @returns {Promise<{plantations: object, health: object, rewards: object}>}
   */
  async getAdminDashboardMetrics() {
    const plantationSql = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'Verified')::int AS verified,
        COUNT(*) FILTER (WHERE status = 'Pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'Under Review')::int AS "underReview",
        COUNT(*) FILTER (WHERE status = 'Rejected')::int AS rejected
      FROM trees;
    `;

    const healthSql = `
      SELECT COUNT(DISTINCT tree_id)::int AS "treesWithHealthLogs"
      FROM health_logs;
    `;

    const rewardSql = `
      SELECT COALESCE(SUM(points), 0)::int AS "totalPointsIssued"
      FROM rewards;
    `;

    const [plantationRes, healthRes, rewardRes] = await Promise.all([
      query(plantationSql),
      query(healthSql),
      query(rewardSql),
    ]);

    const plantationRow = plantationRes.rows[0] || {};
    const healthRow = healthRes.rows[0] || {};
    const rewardRow = rewardRes.rows[0] || {};

    return {
      plantations: {
        total: plantationRow.total || 0,
        verified: plantationRow.verified || 0,
        pending: plantationRow.pending || 0,
        underReview: plantationRow.underReview || 0,
        rejected: plantationRow.rejected || 0,
      },
      health: {
        treesWithHealthLogs: healthRow.treesWithHealthLogs || 0,
      },
      rewards: {
        totalPointsIssued: rewardRow.totalPointsIssued || 0,
      },
    };
  }

  /**
   * Aggregates user-scoped metrics for the contributor dashboard.
   * Executes set-based SQL aggregations scoped strictly to the authenticated user.
   * @param {string} contributorId - Contributor user UUID
   * @returns {Promise<{plantations: object, health: object, rewards: object}>}
   */
  async getContributorDashboardMetrics(contributorId) {
    const plantationSql = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'Verified')::int AS verified,
        COUNT(*) FILTER (WHERE status = 'Pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'Under Review')::int AS "underReview",
        COUNT(*) FILTER (WHERE status = 'Rejected')::int AS rejected
      FROM trees
      WHERE contributor_id = $1;
    `;

    const healthSql = `
      SELECT COUNT(DISTINCT hl.tree_id)::int AS "monitoredTrees"
      FROM health_logs hl
      JOIN trees t ON hl.tree_id = t.id
      WHERE t.contributor_id = $1;
    `;

    const rewardTotalSql = `
      SELECT COALESCE(SUM(points), 0)::int AS "totalPoints"
      FROM rewards
      WHERE user_id = $1;
    `;

    const recentActivitiesSql = `
      SELECT
        id,
        activity,
        points,
        created_at AS "createdAt"
      FROM rewards
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 5;
    `;

    const [plantationRes, healthRes, rewardTotalRes, recentActivitiesRes] = await Promise.all([
      query(plantationSql, [contributorId]),
      query(healthSql, [contributorId]),
      query(rewardTotalSql, [contributorId]),
      query(recentActivitiesSql, [contributorId]),
    ]);

    const plantationRow = plantationRes.rows[0] || {};
    const healthRow = healthRes.rows[0] || {};
    const rewardTotalRow = rewardTotalRes.rows[0] || {};

    return {
      plantations: {
        total: plantationRow.total || 0,
        verified: plantationRow.verified || 0,
        pending: plantationRow.pending || 0,
        underReview: plantationRow.underReview || 0,
        rejected: plantationRow.rejected || 0,
      },
      health: {
        monitoredTrees: healthRow.monitoredTrees || 0,
      },
      rewards: {
        totalPoints: rewardTotalRow.totalPoints || 0,
        recentActivities: recentActivitiesRes.rows || [],
      },
    };
  }
}

module.exports = new DashboardRepository();
