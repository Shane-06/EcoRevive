import { apiClient } from '../api/client';

/**
 * Service for Contributor/User Rewards and Point Ledgers (M12/M16).
 */
export const rewardService = {
  /**
   * Retrieves the authenticated user's total points and paginated activity history.
   * Access: Private (Authenticated user).
   * @param {object} [params={}]
   * @param {number} [params.page=1]
   * @param {number} [params.pageSize=20]
   * @returns {Promise<{ totalPoints: number, activities: Array<object>, pagination: object }>}
   */
  async getMyRewards({ page = 1, pageSize = 20 } = {}) {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    }).toString();

    const response = await apiClient.get(`/rewards/me?${query}`);
    return response.data;
  },
};

export default rewardService;
