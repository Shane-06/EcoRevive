import { apiClient } from '../api/client';

/**
 * Service for Map and Geospatial backend endpoints.
 */
export const mapService = {
  /**
   * Fetches verified trees within a map bounding box viewport.
   * @param {object} params
   * @param {number} params.minLat
   * @param {number} params.minLng
   * @param {number} params.maxLat
   * @param {number} params.maxLng
   * @param {number} [params.page=1]
   * @param {number} [params.pageSize=50]
   * @returns {Promise<{ trees: Array<object>, pagination: object }>}
   */
  async getTreesInViewport({ minLat, minLng, maxLat, maxLng, page = 1, pageSize = 50 }) {
    const query = new URLSearchParams({
      minLat: String(minLat),
      minLng: String(minLng),
      maxLat: String(maxLat),
      maxLng: String(maxLng),
      page: String(page),
      pageSize: String(pageSize),
    }).toString();

    const response = await apiClient.get(`/trees/map?${query}`);
    return response.data;
  },

  /**
   * Fetches location details of a single public verified tree.
   * @param {string} treeId
   * @returns {Promise<object>}
   */
  async getTreeLocation(treeId) {
    const response = await apiClient.get(`/trees/${encodeURIComponent(treeId)}/location`);
    return response.data;
  },
};

export default mapService;
