import { apiClient } from '../api/client';

/**
 * Service for Environmental Information backend endpoint.
 */
export const environmentService = {
  /**
   * Retrieves environmental assessment data for given coordinates.
   * @param {object} params
   * @param {number|string} params.lat - Latitude coordinate (-90 to 90)
   * @param {number|string} params.lng - Longitude coordinate (-180 to 180)
   * @param {object} [options] - Optional fetch options e.g. { signal }
   * @returns {Promise<object>} Normalized environment payload
   */
  async getEnvironment({ lat, lng }, options) {
    const query = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
    }).toString();

    const response = options?.signal
      ? await apiClient.get(`/environment?${query}`, options)
      : await apiClient.get(`/environment?${query}`);
    return response.data;
  },
};

export default environmentService;
