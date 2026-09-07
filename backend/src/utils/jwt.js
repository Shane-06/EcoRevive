const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Signs a payload to generate a JWT token.
 * @param {object} payload - Authenticated user payload { id, role }
 * @param {object} [options] - Optional jwt signing options
 * @returns {string} Signed JWT token string
 */
const signToken = (payload, options = {}) => {
  const signOptions = {
    expiresIn: config.jwt.expiresIn,
    ...options,
  };

  return jwt.sign(payload, config.jwt.secret, signOptions);
};

/**
 * Verifies a JWT token using the configured secret.
 * @param {string} token - JWT token string
 * @returns {object} Decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

module.exports = {
  signToken,
  verifyToken,
};
