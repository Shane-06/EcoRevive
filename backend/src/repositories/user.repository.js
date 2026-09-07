const { query } = require('../config/db');

/**
 * User Repository for database interactions with the users table.
 */
class UserRepository {
  /**
   * Finds a user by their email address (case-insensitive).
   * @param {string} email - Email address to look up
   * @returns {Promise<object|null>} User record including password_hash or null
   */
  async findByEmail(email) {
    const res = await query(
      'SELECT id, name, email, password_hash, role, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1);',
      [email]
    );
    return res.rows[0] || null;
  }

  /**
   * Finds a user by their unique ID (excluding password_hash).
   * @param {string} id - User UUID
   * @returns {Promise<object|null>} User record without password_hash or null
   */
  async findById(id) {
    const res = await query(
      'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1;',
      [id]
    );
    return res.rows[0] || null;
  }

  /**
   * Creates a new user record in the database.
   * @param {object} userData
   * @param {string} userData.name - User's full name
   * @param {string} userData.email - Normalized email
   * @param {string} userData.passwordHash - Hashed password
   * @param {string} [userData.role='contributor'] - User role
   * @returns {Promise<object>} Created user record (excluding password_hash)
   */
  async create({ name, email, passwordHash, role = 'contributor' }) {
    const res = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at, updated_at;`,
      [name, email, passwordHash, role]
    );
    return res.rows[0];
  }

  /**
   * Deletes a user by ID (useful for deterministic test teardown).
   * @param {string} id - User UUID
   * @returns {Promise<void>}
   */
  async deleteById(id) {
    await query('DELETE FROM users WHERE id = $1;', [id]);
  }
}

module.exports = new UserRepository();
