/**
 * Helper to resolve optional code string vs details object.
 */
const resolveCodeAndDetails = (defaultCode, codeOrDetails, possibleDetails) => {
  if (typeof codeOrDetails === 'string') {
    return { code: codeOrDetails, details: possibleDetails || null };
  }
  return { code: defaultCode, details: codeOrDetails || null };
};

/**
 * Base Application Error class conforming to EcoRevive API error standards.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request', codeOrDetails = 'BAD_REQUEST', details = null) {
    const resolved = resolveCodeAndDetails('BAD_REQUEST', codeOrDetails, details);
    super(message, 400, resolved.code, resolved.details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', codeOrDetails = 'UNAUTHORIZED', details = null) {
    const resolved = resolveCodeAndDetails('UNAUTHORIZED', codeOrDetails, details);
    super(message, 401, resolved.code, resolved.details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', codeOrDetails = 'FORBIDDEN', details = null) {
    const resolved = resolveCodeAndDetails('FORBIDDEN', codeOrDetails, details);
    super(message, 403, resolved.code, resolved.details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', codeOrDetails = 'NOT_FOUND', details = null) {
    const resolved = resolveCodeAndDetails('NOT_FOUND', codeOrDetails, details);
    super(message, 404, resolved.code, resolved.details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict', codeOrDetails = 'CONFLICT', details = null) {
    const resolved = resolveCodeAndDetails('CONFLICT', codeOrDetails, details);
    super(message, 409, resolved.code, resolved.details);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', codeOrDetails = 'VALIDATION_ERROR', details = null) {
    const resolved = resolveCodeAndDetails('VALIDATION_ERROR', codeOrDetails, details);
    super(message, 422, resolved.code, resolved.details);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
};
