const suitabilityService = require('../services/suitability.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Controller for Suitability Assessment endpoints.
 */
class SuitabilityController {
  /**
   * Handles GET /api/v1/suitability?lat=&lng=&species=
   * Performs rule-based suitability assessment for a species at a given location.
   */
  async getSuitability(req, res, next) {
    try {
      const { lat, lng, species } = req.query;
      const result = await suitabilityService.assessSuitability({ lat, lng, species });
      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new SuitabilityController();
