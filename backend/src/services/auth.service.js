const userRepository = require('../repositories/user.repository');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} = require('../utils/errors');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class AuthService {
  /**
   * Registers a new user with default 'contributor' role.
   * @param {object} input
   * @param {string} input.name - User's name
   * @param {string} input.email - User's email
   * @param {string} input.password - User's password
   * @returns {Promise<{user: object, token: string}>}
   */
  async register({ name, email, password }) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new BadRequestError('Name is required');
    }
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new BadRequestError('Email is required');
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      throw new BadRequestError('Invalid email format');
    }
    if (!password || typeof password !== 'string' || password === '') {
      throw new BadRequestError('Password is required');
    }

    // Check if email already registered
    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictError('An account with this email already exists', {
        field: 'email',
      });
    }

    // Hash password and enforce default contributor role
    const passwordHash = await hashPassword(password);
    const createdUser = await userRepository.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'contributor',
    });

    const userPayload = {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role,
    };

    const token = signToken({
      id: userPayload.id,
      role: userPayload.role,
    });

    return {
      user: userPayload,
      token,
    };
  }

  /**
   * Authenticates a user with email and password.
   * @param {object} input
   * @param {string} input.email
   * @param {string} input.password
   * @returns {Promise<{user: object, token: string}>}
   */
  async login({ email, password }) {
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new BadRequestError('Email is required');
    }
    if (!password || typeof password !== 'string' || password === '') {
      throw new BadRequestError('Password is required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);

    // Generic error message to prevent leaking account existence
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = signToken({
      id: userPayload.id,
      role: userPayload.role,
    });

    return {
      user: userPayload,
      token,
    };
  }

  /**
   * Retrieves current authenticated user profile by user ID.
   * @param {string} userId - User UUID
   * @returns {Promise<object>} User profile without sensitive data
   */
  async getCurrentUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User account not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}

module.exports = new AuthService();
