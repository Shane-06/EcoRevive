import { apiClient } from '../api/client';

/**
 * Service for Admin Manual Verification Workflow endpoints (M9/M15).
 */
export const verificationService = {
  /**
   * Retrieves review queue with optional status filtering and pagination.
   * @param {object} [params={}]
   * @param {string} [params.status] - 'Pending' | 'Under Review' | 'Verified' | 'Rejected'
   * @param {number} [params.page=1]
   * @param {number} [params.pageSize=20]
   * @returns {Promise<{ trees: Array<object>, pagination: object }>}
   */
  async getReviewQueue({ status, page = 1, pageSize = 20 } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (status && status !== 'All') {
      params.append('status', status);
    }

    const response = await apiClient.get(`/admin/verifications?${params.toString()}`);
    return response.data;
  },

  /**
   * Starts review on a plantation (transitions Pending -> Under Review).
   * @param {string} treeId - Internal UUID of tree record
   * @returns {Promise<{ tree: object }>}
   */
  async startReview(treeId) {
    const response = await apiClient.patch(`/admin/verifications/${encodeURIComponent(treeId)}/start`);
    return response.data;
  },

  /**
   * Approves a plantation (transitions Under Review -> Verified, generates Tree ID).
   * @param {string} treeId - Internal UUID of tree record
   * @returns {Promise<{ tree: object, identity: object }>}
   */
  async approveVerification(treeId) {
    const response = await apiClient.patch(`/admin/verifications/${encodeURIComponent(treeId)}/approve`);
    return response.data;
  },

  /**
   * Rejects a plantation (transitions Under Review -> Rejected with mandatory reason).
   * @param {string} treeId - Internal UUID of tree record
   * @param {object} payload - { reason: string }
   * @returns {Promise<{ tree: object }>}
   */
  async rejectVerification(treeId, { reason }) {
    const response = await apiClient.patch(
      `/admin/verifications/${encodeURIComponent(treeId)}/reject`,
      { reason }
    );
    return response.data;
  },
};

export default verificationService;
