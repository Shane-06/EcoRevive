import { apiClient } from '../api/client';

/**
 * Service for Contributor Tree and Plantation backend endpoints (M5/M15).
 */
export const treeService = {
  /**
   * Registers a new plantation record in Pending status.
   * Supports JSON payload or FormData multipart for photo upload.
   * @param {object|FormData} payload
   * @returns {Promise<{ tree: object }>}
   */
  async registerPlantation(payload) {
    let options = {};
    if (payload instanceof FormData) {
      options = {
        method: 'POST',
        body: payload,
      };
      const response = await apiClient.request('/trees', options);
      return response.data;
    }

    const response = await apiClient.post('/trees', payload);
    return response.data;
  },

  /**
   * Retrieves paginated plantations registered by the authenticated contributor.
   * @param {object} [params={}]
   * @param {number} [params.page=1]
   * @param {number} [params.pageSize=20]
   * @returns {Promise<{ trees: Array<object>, pagination: object }>}
   */
  async getMyPlantations({ page = 1, pageSize = 20 } = {}) {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    }).toString();

    const response = await apiClient.get(`/trees/mine?${query}`);
    return response.data;
  },
};

export default treeService;
