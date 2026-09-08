const dashboardRepository = require('../repositories/dashboard.repository');
const { BadRequestError } = require('../utils/errors');

class DashboardService {
  /**
   * Retrieves aggregated system-wide dashboard metrics for administrators.
   * @returns {Promise<{plantations: object, health: object, rewards: object}>}
   */
  async getAdminDashboard() {
    return dashboardRepository.getAdminDashboardMetrics();
  }

  /**
   * Retrieves user-scoped dashboard metrics for an authenticated contributor.
   * @param {string} userId - Authenticated user UUID
   * @returns {Promise<{plantations: object, health: object, rewards: object}>}
   */
  async getContributorDashboard(userId) {
    if (!userId) {
      throw new BadRequestError('User ID is required', 'MISSING_USER_ID');
    }

    const data = await dashboardRepository.getContributorDashboardMetrics(userId);

    // Format recent activities timestamps
    if (data.rewards && Array.isArray(data.rewards.recentActivities)) {
      data.rewards.recentActivities = data.rewards.recentActivities.map((act) => ({
        id: act.id,
        activity: act.activity,
        points: act.points,
        createdAt: act.createdAt instanceof Date ? act.createdAt.toISOString() : act.createdAt,
      }));
    }

    return data;
  }
}

module.exports = new DashboardService();
