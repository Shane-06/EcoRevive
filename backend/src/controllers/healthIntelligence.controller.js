/**
 * EcoRevive V2-M4 — Health Intelligence Controller
 *
 * Exposes scoped collection and single-tree endpoints for deterministic
 * Tree Health Intelligence.
 */

const healthIntelligenceService = require('../services/healthIntelligence/healthIntelligence.service');
const { sendSuccess } = require('../utils/apiResponse');

class HealthIntelligenceController {
  /**
   * Handles GET /api/v1/health-intelligence
   * Retrieves paginated health intelligence insights scoped to the authenticated user.
   */
  async getInsights(req, res, next) {
    try {
      const { page, pageSize, now, intervalDays } = req.query;
      const user = req.user;

      const result = await healthIntelligenceService.listInsights({
        user,
        page,
        pageSize,
        now,
        intervalDays,
      });

      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Handles GET /api/v1/health-intelligence/trees/:treeId
   * Retrieves deterministic health intelligence insight for a single verified tree.
   */
  async getTreeInsight(req, res, next) {
    try {
      const { treeId } = req.params;
      const { now, intervalDays } = req.query;
      const user = req.user;

      const result = await healthIntelligenceService.getTreeInsight({
        treeIdentifier: treeId,
        user,
        now,
        intervalDays,
      });

      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new HealthIntelligenceController();
