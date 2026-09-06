const { Router } = require('express');
const healthRoutes = require('./health.routes');
const v1Routes = require('./v1.routes');

const router = Router();

// Core API endpoints (e.g. /api/health)
router.use('/', healthRoutes);

// API v1 namespace (/api/v1)
router.use('/v1', v1Routes);

module.exports = router;
