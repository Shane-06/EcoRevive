const { Router } = require('express');
const treeController = require('../controllers/tree.controller');
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

module.exports = router;
