const suitabilityRepository = require('../repositories/suitability.repository');
const environmentService = require('./environment.service');
const {
  evaluateSoil,
  evaluateSunlight,
  evaluateWater,
  evaluateSpacing,
  evaluateOverall,
} = require('./suitability.rules');
const { BadRequestError, NotFoundError } = require('../utils/errors');

class SuitabilityService {
  /**
   * Retrieves the full species catalog from the database rules table.
   * @returns {Promise<{species: Array<object>}>}
   */
  async getSpeciesCatalog() {
    const rules = await suitabilityRepository.findAllSpeciesRules();
    const formattedSpecies = rules.map((row) => ({
      name: row.species,
      soilType: row.soil_type,
      minSpacingMeters: parseFloat(row.min_spacing_m),
      sunlight: row.sunlight,
      waterNeed: row.water_need,
      climateRegion: row.climate_region,
    }));

    return { species: formattedSpecies };
  }

  /**
   * Evaluates rule-based species suitability for given coordinates.
   * @param {object} params
   * @param {number|string} params.lat - Latitude coordinate
   * @param {number|string} params.lng - Longitude coordinate
   * @param {string} params.species - Species name to assess
   * @returns {Promise<object>} Suitability assessment object
   */
  async assessSuitability({ lat, lng, species }) {
    // 1. Validate species query parameter
    if (species === undefined || species === null || typeof species !== 'string' || species.trim() === '') {
      throw new BadRequestError('Species parameter (species) is required', 'MISSING_SPECIES_PARAMETER');
    }
    const cleanSpecies = species.trim();

    // 2. Validate coordinates query parameters
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

    // 3. Retrieve species rule from database
    const rule = await suitabilityRepository.findRuleBySpecies(cleanSpecies);
    if (!rule) {
      throw new NotFoundError(
        `Species '${cleanSpecies}' not found in suitability catalog`,
        'SPECIES_NOT_FOUND'
      );
    }

    // 4. Retrieve M7 environmental data
    const envData = await environmentService.getLocationEnvironment({
      lat: parsedLat,
      lng: parsedLng,
    });

    // 5. Evaluate deterministic checks
    const soilCheck = evaluateSoil(rule, envData.soil);
    const sunlightCheck = evaluateSunlight(rule, envData.weather);
    const waterCheck = evaluateWater(rule, envData.weather);
    const spacingCheck = evaluateSpacing(rule);

    const checks = {
      soil: soilCheck,
      sunlight: sunlightCheck,
      water: waterCheck,
      spacing: spacingCheck,
    };

    // 6. Evaluate overall suitability with deterministic precedence
    const overall = evaluateOverall(checks, rule.species);

    return {
      species: rule.species,
      location: {
        latitude: parsedLat,
        longitude: parsedLng,
      },
      checks,
      overall,
    };
  }
}

module.exports = new SuitabilityService();
