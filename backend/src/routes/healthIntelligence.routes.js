/**
 * EcoRevive V2-M4 — Health Intelligence Routes
 *
 * Routes for deterministic Tree Health Intelligence.
 * Strictly protected by authentication middleware; role authorization is enforced
 * dynamically per record in the service and repository layers.
 */

const { Router } = require('express');
const healthIntelligenceController = require('../controllers/healthIntelligence.controller');
const authenticate = require('../middleware/auth.middleware');

const router = Router();

/**
 * @route GET /api/v1/health-intelligence
 * @desc Retrieve paginated health intelligence insights scoped to authenticated user
 * @access Private (Contributor, Caretaker, Admin)
 */
router.get(
  '/',
  authenticate,
  healthIntelligenceController.getInsights.bind(healthIntelligenceController)
);

/**
 * @route GET /api/v1/health-intelligence/trees/:treeId
 * @desc Retrieve deterministic health intelligence insight for a single verified tree
 * @access Private (Contributor, Caretaker, Admin)
 */
router.get(
  '/trees/:treeId',
  authenticate,
  healthIntelligenceController.getTreeInsight.bind(healthIntelligenceController)
);

module.exports = router;
