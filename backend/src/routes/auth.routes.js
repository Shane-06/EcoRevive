const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Public contributor registration
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Public user login
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user profile
 * @access  Protected (Bearer JWT)
 */
router.get('/me', authenticate, authController.getMe);

module.exports = router;
