const environmentService = require('../services/environment.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Controller for Environmental Information endpoints.
 */
class EnvironmentController {
  /**
   * Handles GET /api/v1/environment
   * Retrieves environmental assessment data for given coordinates.
   */
  async getEnvironment(req, res, next) {
    try {
      const { lat, lng, section } = req.query;
      const result = await environmentService.getLocationEnvironment({ lat, lng, section });

      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new EnvironmentController();
