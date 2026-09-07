const { Router } = require('express');
const { getHealthStatus } = require('../controllers/health.controller');
const authRoutes = require('./auth.routes');
const treeRoutes = require('./tree.routes');

const router = Router();

/**
 * Health check alias under API v1
 * @route GET /api/v1/health
 */
router.get('/health', getHealthStatus);

/**
 * Authentication & RBAC routes under API v1
 * @route /api/v1/auth
 */
router.use('/auth', authRoutes);

/**
 * Tree & Plantation routes under API v1
 * @route /api/v1/trees
 */
router.use('/trees', treeRoutes);

// Future milestone domain routes:
// router.use('/environment', environmentRoutes);
// router.use('/suitability', suitabilityRoutes);
// router.use('/admin', adminRoutes);

module.exports = router;
