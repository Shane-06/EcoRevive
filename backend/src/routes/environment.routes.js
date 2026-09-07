const { Router } = require('express');
const environmentController = require('../controllers/environment.controller');

const router = Router();

/**
 * @route GET /api/v1/environment
 * @desc Retrieve normalized environmental (weather + soil) data for coordinates
 * @access Public
 */
router.get('/', environmentController.getEnvironment.bind(environmentController));

module.exports = router;
