import { apiClient } from '../api/client';

/**
 * Service for Caretaker Health Monitoring and Observation Logs (M11/M16).
 */
export const healthService = {
  /**
   * Submits a new health observation log for a Verified tree with a permanent Tree ID.
   * Access: Protected (Caretaker only).
   * @param {string} treeIdentifier - Verified Tree ID (ER-PLT-XXXXX) or tree UUID
   * @param {object|FormData} payload - Health log details { healthStatus, notes, photoReference } or FormData
   * @returns {Promise<{ healthLog: object }>}
   */
  async createHealthLog(treeIdentifier, payload) {
    if (!treeIdentifier) {
      throw new Error('Tree ID is required');
    }

    const endpoint = `/trees/${encodeURIComponent(treeIdentifier)}/health-logs`;

    if (payload instanceof FormData) {
      const response = await apiClient.request(endpoint, {
        method: 'POST',
        body: payload,
      });
      return response.data;
    }

    const response = await apiClient.post(endpoint, payload);
    return response.data;
  },

  /**
   * Retrieves chronological paginated health observation history for a Verified tree.
   * Access: Public.
   * @param {string} treeIdentifier - Verified Tree ID or tree UUID
   * @param {object} [params={}]
   * @param {number} [params.page=1]
   * @param {number} [params.pageSize=20]
   * @returns {Promise<{ treeId: string, healthLogs: Array<object>, pagination: object }>}
   */
  async getHealthHistory(treeIdentifier, { page = 1, pageSize = 20 } = {}) {
    if (!treeIdentifier) {
      throw new Error('Tree ID is required');
    }

    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    }).toString();

    const endpoint = `/trees/${encodeURIComponent(treeIdentifier)}/health-logs?${query}`;
    const response = await apiClient.get(endpoint);
    return response.data;
  },
};

export default healthService;
