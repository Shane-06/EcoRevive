import { apiClient } from '../api/client';

const inFlightEnvRequests = new Map();

/**
 * Service for Environmental Information backend endpoint.
 */
export const environmentService = {
  /**
   * Retrieves environmental assessment data for given coordinates.
   * Deduplicates concurrent in-flight requests for identical coordinates.
   * @param {object} params
   * @param {number|string} params.lat - Latitude coordinate (-90 to 90)
   * @param {number|string} params.lng - Longitude coordinate (-180 to 180)
   * @param {object} [options] - Optional fetch options e.g. { signal }
   * @returns {Promise<object>} Normalized environment payload
   */
  async getEnvironment({ lat, lng }, options) {
    const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
    const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);
    const coordKey = !isNaN(latNum) && !isNaN(lngNum)
      ? `${latNum.toFixed(4)}:${lngNum.toFixed(4)}`
      : `${lat}:${lng}`;

    if (!options?.signal && inFlightEnvRequests.has(coordKey)) {
      return inFlightEnvRequests.get(coordKey);
    }

    const query = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
    }).toString();

    const fetchPromise = (async () => {
      try {
        const response = options?.signal
          ? await apiClient.get(`/environment?${query}`, options)
          : await apiClient.get(`/environment?${query}`);
        return response.data;
      } finally {
        inFlightEnvRequests.delete(coordKey);
      }
    })();

    if (!options?.signal) {
      inFlightEnvRequests.set(coordKey, fetchPromise);
    }

    return fetchPromise;
  },

  /**
   * Clears pending in-flight requests (used in tests).
   */
  _clearInFlight() {
    inFlightEnvRequests.clear();
  },
};

export default environmentService;
