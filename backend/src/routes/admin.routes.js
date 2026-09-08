const { Router } = require('express');
const authenticate = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const verificationController = require('../controllers/verification.controller');
const dashboardController = require('../controllers/dashboard.controller');

const router = Router();

/**
 * @route GET /api/v1/admin/dashboard
 * @desc Retrieve system-wide aggregate dashboard metrics
 * @access Protected (Admin only)
 */
router.get(
  '/dashboard',
  authenticate,
  requireRole('admin'),
  dashboardController.getAdminDashboard.bind(dashboardController)
);

/**
 * Admin Verification Routes
 * All routes are protected by JWT authentication and require the 'admin' role.
 */
router.use('/verifications', authenticate, requireRole('admin'));

/**
 * @route GET /api/v1/admin/verifications
 * @desc Retrieve review queue with status filtering & pagination
 * @access Protected (Admin only)
 */
router.get('/verifications', verificationController.getReviewQueue);

/**
 * @route PATCH /api/v1/admin/verifications/:treeId/start
 * @desc Start review on a plantation record (Pending -> Under Review)
 * @access Protected (Admin only)
 */
router.patch('/verifications/:treeId/start', verificationController.startReview);

/**
 * @route PATCH /api/v1/admin/verifications/:treeId/approve
 * @desc Approve a plantation record (Under Review -> Verified)
 * @access Protected (Admin only)
 */
router.patch('/verifications/:treeId/approve', verificationController.approveVerification);

/**
 * @route PATCH /api/v1/admin/verifications/:treeId/reject
 * @desc Reject a plantation record (Under Review -> Rejected)
 * @access Protected (Admin only)
 */
router.patch('/verifications/:treeId/reject', verificationController.rejectVerification);

module.exports = router;
