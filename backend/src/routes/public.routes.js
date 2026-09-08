const { Router } = require('express');
const identityController = require('../controllers/identity.controller');

const router = Router();

/**
 * @route GET /api/v1/public/trees/:treeId
 * @desc Retrieve privacy-safe public profile of a Verified tree
 * @access Public
 */
router.get('/trees/:treeId', identityController.getPublicProfile);

/**
 * @route GET /api/v1/public/trees/:treeId/qr
 * @desc Retrieve public QR code payload and profile URL for a Verified tree
 * @access Public
 */
router.get('/trees/:treeId/qr', identityController.getPublicQr);

module.exports = router;
