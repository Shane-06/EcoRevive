const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Authentication Controller handling incoming HTTP requests.
 */
class AuthController {
  /**
   * @route POST /api/v1/auth/register
   * @desc Register a new contributor account
   * @access Public
   */
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return sendSuccess(res, result, 201);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * @route POST /api/v1/auth/login
   * @desc Authenticate user and return JWT
   * @access Public
   */
  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * @route GET /api/v1/auth/me
   * @desc Retrieve authenticated user profile
   * @access Protected (JWT)
   */
  async getMe(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id);
      return sendSuccess(res, { user }, 200);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new AuthController();
