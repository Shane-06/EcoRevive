import { apiClient } from '../api/client';

/**
 * Service for Species Catalog backend endpoint.
 */
export const speciesService = {
  /**
   * Retrieves the canonical species catalog.
   * @returns {Promise<{ species: Array<object> }>}
   */
  async getSpeciesCatalog() {
    const response = await apiClient.get('/species');
    return response.data;
  },
};

export default speciesService;
