const dashboardService = require('../services/dashboard.service');

class DashboardController {
  /**
   * GET /api/v1/dashboard/me
   * Retrieves user-scoped dashboard metrics for the authenticated contributor/user.
   */
  async getMyDashboard(req, res, next) {
    try {
      const data = await dashboardService.getContributorDashboard(req.user.id);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /api/v1/admin/dashboard
   * Retrieves aggregated system-wide dashboard metrics for administrators.
   */
  async getAdminDashboard(req, res, next) {
    try {
      const data = await dashboardService.getAdminDashboard();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new DashboardController();
