const { Router } = require('express');
const rewardController = require('../controllers/reward.controller');
const authenticate = require('../middleware/auth.middleware');

const router = Router();

/**
 * @route GET /api/v1/rewards/me
 * @desc Retrieve total reward points and paginated activity history for authenticated user
 * @access Private (Contributor, Caretaker, Admin)
 */
router.get('/me', authenticate, rewardController.getMyRewards.bind(rewardController));

module.exports = router;
