const config = require('../config');
const { sendError } = require('../utils/apiResponse');

/**
 * Centralized global error handling middleware for EcoRevive backend.
 */
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Handle malformed JSON body errors from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    code = 'INVALID_JSON_BODY';
    message = 'Malformed JSON in request payload';
  }

  // In development, provide debug details if not already present
  if (config.env === 'development' && statusCode === 500 && !details && err.stack) {
    details = {
      stack: err.stack,
    };
  }

  // Log server errors (5xx)
  if (statusCode >= 500 && !config.isTest) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
  }

  return sendError(res, message, statusCode, code, details);
};

module.exports = errorHandler;
