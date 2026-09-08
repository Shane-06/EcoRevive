const { Router } = require('express');
const { getHealthStatus } = require('../controllers/health.controller');
const authRoutes = require('./auth.routes');
const treeRoutes = require('./tree.routes');
const environmentRoutes = require('./environment.routes');
const speciesRoutes = require('./species.routes');
const suitabilityRoutes = require('./suitability.routes');
const adminRoutes = require('./admin.routes');

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

/**
 * Environmental information routes under API v1
 * @route /api/v1/environment
 */
router.use('/environment', environmentRoutes);

/**
 * Species catalog routes under API v1
 * @route /api/v1/species
 */
router.use('/species', speciesRoutes);

/**
 * Suitability assessment routes under API v1
 * @route /api/v1/suitability
 */
router.use('/suitability', suitabilityRoutes);

/**
 * Admin & Verification routes under API v1
 * @route /api/v1/admin
 */
router.use('/admin', adminRoutes);

module.exports = router;
