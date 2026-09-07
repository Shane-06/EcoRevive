const openMeteoProvider = require('../integrations/openMeteo.provider');
const soilGridsProvider = require('../integrations/soilGrids.provider');
const { BadRequestError } = require('../utils/errors');

class EnvironmentService {
  /**
   * Retrieves environmental conditions for a specific location.
   * Concurrently queries Open-Meteo and ISRIC SoilGrids and normalizes responses.
   * @param {object} params
   * @param {number|string} params.lat - Latitude coordinate
   * @param {number|string} params.lng - Longitude coordinate
   * @returns {Promise<object>} Normalized environmental assessment data
   */
  async getLocationEnvironment({ lat, lng }) {
    if (lat === undefined || lat === null || lat === '') {
      throw new BadRequestError('Latitude (lat) is required', 'MISSING_COORDINATES');
    }
    if (lng === undefined || lng === null || lng === '') {
      throw new BadRequestError('Longitude (lng) is required', 'MISSING_COORDINATES');
    }

    const parsedLat = typeof lat === 'number' ? lat : parseFloat(lat);
    const parsedLng = typeof lng === 'number' ? lng : parseFloat(lng);

    if (isNaN(parsedLat) || !isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      throw new BadRequestError(
        'Latitude must be a valid number between -90 and 90',
        'INVALID_COORDINATES'
      );
    }
    if (isNaN(parsedLng) || !isFinite(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      throw new BadRequestError(
        'Longitude must be a valid number between -180 and 180',
        'INVALID_COORDINATES'
      );
    }

    // Execute provider lookups concurrently
    const [weather, soil] = await Promise.all([
      openMeteoProvider.fetchWeather({ latitude: parsedLat, longitude: parsedLng }),
      soilGridsProvider.fetchSoil({ latitude: parsedLat, longitude: parsedLng }),
    ]);

    return {
      location: {
        latitude: parsedLat,
        longitude: parsedLng,
      },
      weather,
      soil,
      terrain: {
        status: 'unavailable',
        source: null,
        verifiedAt: null,
        data: null,
      },
      land: {
        status: 'unavailable',
        source: null,
        verifiedAt: null,
        data: null,
      },
      water: {
        status: 'unavailable',
        source: null,
        verifiedAt: null,
        data: null,
      },
    };
  }
}

module.exports = new EnvironmentService();
