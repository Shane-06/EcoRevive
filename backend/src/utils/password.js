const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt.
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} Hashed password string
 */
const hashPassword = async (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compares a plaintext password against a stored bcrypt hash.
 * @param {string} password - Plaintext password
 * @param {string} hash - Stored bcrypt hash
 * @returns {Promise<boolean>} True if password matches hash, false otherwise
 */
const comparePassword = async (password, hash) => {
  if (!password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
};

module.exports = {
  hashPassword,
  comparePassword,
};
