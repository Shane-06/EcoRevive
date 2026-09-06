const { NotFoundError } = require('../utils/errors');

/**
 * Middleware to catch unhandled routes and generate a standard 404 NotFoundError.
 */
const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = notFoundHandler;
