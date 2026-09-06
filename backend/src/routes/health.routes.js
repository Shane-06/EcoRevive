const { Router } = require('express');
const { getHealthStatus } = require('../controllers/health.controller');

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Get service health status
 * @access  Public
 */
router.get('/health', getHealthStatus);

module.exports = router;
