const { Router } = require('express');
const treeController = require('../controllers/tree.controller');
const treeHealthController = require('../controllers/treeHealth.controller');
const authenticate = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { optionalPhotoUpload } = require('../middleware/upload.middleware');

const router = Router();

/**
 * @route POST /api/v1/trees
 * @desc Register a new plantation record (Pending status, tree_id = NULL)
 * @access Private (Contributor)
 */
router.post(
  '/',
  authenticate,
  requireRole('contributor'),
  optionalPhotoUpload,
  treeController.createTree.bind(treeController)
);

/**
 * @route GET /api/v1/trees/mine
 * @desc Retrieve plantations registered by authenticated contributor
 * @access Private (Contributor)
 */
router.get(
  '/mine',
  authenticate,
  requireRole('contributor'),
  treeController.getMyTrees.bind(treeController)
);

/**
 * @route GET /api/v1/trees/map
 * @desc Retrieve verified trees inside map viewport bounding box
 * @access Public
 */
router.get('/map', treeController.getMapTrees.bind(treeController));

/**
 * @route GET /api/v1/trees/nearby
 * @desc Retrieve verified trees nearby a coordinate within radius in meters
 * @access Public
 */
router.get('/nearby', treeController.getNearbyTrees.bind(treeController));

/**
 * @route GET /api/v1/trees/:treeId/location
 * @desc Retrieve location of a single verified tree by public Tree ID
 * @access Public
 */
router.get('/:treeId/location', treeController.getTreeLocation.bind(treeController));

/**
 * @route POST /api/v1/trees/:treeId/health-logs
 * @desc Submit a new health observation log for a Verified tree
 * @access Private (Caretaker)
 */
router.post(
  '/:treeId/health-logs',
  authenticate,
  requireRole('caretaker'),
  optionalPhotoUpload,
  treeHealthController.createHealthLog.bind(treeHealthController)
);

/**
 * @route GET /api/v1/trees/:treeId/health-logs
 * @desc Retrieve chronological health history for a Verified tree
 * @access Public
 */
router.get('/:treeId/health-logs', treeHealthController.getHealthHistory.bind(treeHealthController));

module.exports = router;
