/**
 * Standard API response helpers following EcoRevive API Specification V1.0.
 */

const sendSuccess = (res, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

const sendError = (res, message = 'Internal Server Error', statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) => {
  const errorPayload = {
    code,
    message,
  };

  if (details !== null && details !== undefined) {
    errorPayload.details = details;
  }

  return res.status(statusCode).json({
    success: false,
    error: errorPayload,
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
