const { Router } = require('express');
const suitabilityController = require('../controllers/suitability.controller');

const router = Router();

/**
 * @route GET /api/v1/suitability
 * @desc Retrieve deterministic rule-based suitability assessment for a species at coordinates
 * @access Public
 */
router.get('/', suitabilityController.getSuitability);

module.exports = router;
