const { Router } = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const authenticate = require('../middleware/auth.middleware');

const router = Router();

/**
 * @route GET /api/v1/dashboard/me
 * @desc Retrieve user-scoped dashboard metrics for authenticated contributor/user
 * @access Private (Contributor, Caretaker, Admin)
 */
router.get('/me', authenticate, dashboardController.getMyDashboard.bind(dashboardController));

module.exports = router;
