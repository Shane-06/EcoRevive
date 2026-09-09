import { apiClient } from '../api/client';

/**
 * Service for Contributor and Admin Dashboards (M12/M16).
 */
export const dashboardService = {
  /**
   * Retrieves user-scoped dashboard metrics for the authenticated contributor/user.
   * Access: Private (Authenticated user).
   * @returns {Promise<{ plantations: object, health: object, rewards: object }>}
   */
  async getMyDashboard() {
    const response = await apiClient.get('/dashboard/me');
    return response.data;
  },

  /**
   * Retrieves aggregated system-wide dashboard metrics for administrators.
   * Access: Protected (Admin only).
   * @returns {Promise<{ plantations: object, health: object, rewards: object }>}
   */
  async getAdminDashboard() {
    const response = await apiClient.get('/admin/dashboard');
    return response.data;
  },
};

export default dashboardService;
