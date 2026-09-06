const { Router } = require('express');
const { getHealthStatus } = require('../controllers/health.controller');

const router = Router();

/**
 * Health check alias under API v1
 * @route GET /api/v1/health
 */
router.get('/health', getHealthStatus);

// Domain route modules will be mounted here in future milestones (M4+):
// router.use('/auth', authRoutes);
// router.use('/trees', treeRoutes);
// router.use('/environment', environmentRoutes);
// router.use('/suitability', suitabilityRoutes);
// router.use('/admin', adminRoutes);

module.exports = router;
