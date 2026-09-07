const { verifyToken } = require('../utils/jwt');
const { UnauthorizedError } = require('../utils/errors');

/**
 * Authentication middleware to verify JWT Bearer token and attach authenticated user context.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new UnauthorizedError(
        'Authentication token required. Format: Bearer <token>',
        'AUTHENTICATION_REQUIRED'
      )
    );
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return next(
      new UnauthorizedError('Authentication token is missing', 'AUTHENTICATION_REQUIRED')
    );
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id || !decoded.role) {
      return next(new UnauthorizedError('Invalid token payload', 'INVALID_TOKEN'));
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(
        new UnauthorizedError('Authentication token has expired', 'TOKEN_EXPIRED')
      );
    }
    return next(
      new UnauthorizedError('Invalid authentication token', 'INVALID_TOKEN')
    );
  }
};

module.exports = authenticate;
