const { Router } = require('express');
const authenticate = require('../middleware/auth.middleware');
const { aiRateLimiter } = require('../middleware/rateLimit.middleware');
const { chatWithEcoGuide } = require('../controllers/ai.controller');

const router = Router();

/**
 * EcoGuide Conversational Assistant endpoint
 * @route POST /api/v1/ai/chat
 * @access Authenticated (Contributor, Caretaker, Admin)
 */
router.post('/chat', authenticate, aiRateLimiter, chatWithEcoGuide);

module.exports = router;
