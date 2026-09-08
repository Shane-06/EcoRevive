const { Router } = require('express');
const speciesController = require('../controllers/species.controller');

const router = Router();

/**
 * @route GET /api/v1/species
 * @desc Retrieve canonical species catalog
 * @access Public
 */
router.get('/', speciesController.getSpecies);

module.exports = router;
