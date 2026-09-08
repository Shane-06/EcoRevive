import { apiClient } from '../api/client';

/**
 * Service for Deterministic Suitability Engine backend endpoint.
 */
export const suitabilityService = {
  /**
   * Evaluates rule-based species suitability for given coordinates and species name.
   * @param {object} params
   * @param {number|string} params.lat - Latitude coordinate
   * @param {number|string} params.lng - Longitude coordinate
   * @param {string} params.species - Species name
   * @returns {Promise<object>} Suitability assessment data
   */
  async assessSuitability({ lat, lng, species }) {
    const query = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      species: String(species),
    }).toString();

    const response = await apiClient.get(`/suitability?${query}`);
    return response.data;
  },
};

export default suitabilityService;
