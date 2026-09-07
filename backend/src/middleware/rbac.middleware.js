const { ForbiddenError, UnauthorizedError } = require('../utils/errors');

/**
 * Role-Based Access Control (RBAC) middleware factory.
 * @param  {...string} allowedRoles - Array of allowed role names (e.g. 'admin', 'caretaker', 'contributor')
 * @returns {Function} Express middleware function
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(
        new UnauthorizedError('Authentication required before role authorization', 'AUTHENTICATION_REQUIRED')
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: required role [${allowedRoles.join(', ')}], current role [${req.user.role}]`,
          'FORBIDDEN'
        )
      );
    }

    return next();
  };
};

module.exports = {
  requireRole,
};
