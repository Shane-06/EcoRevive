const suitabilityService = require('../services/suitability.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Controller for Species Catalog endpoints.
 */
class SpeciesController {
  /**
   * Handles GET /api/v1/species
   * Retrieves the catalog of supported canonical tree species.
   */
  async getSpecies(req, res, next) {
    try {
      const result = await suitabilityService.getSpeciesCatalog();
      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new SpeciesController();
