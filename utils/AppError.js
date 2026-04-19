/**
 * Typed application errors.
 * Each class carries a `code` and default HTTP `statusCode` so that
 * the global handleError() helper can map them without any instanceof chains.
 */

export class AppError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/** 400 – request data is wrong */
export class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/** 401 – not authenticated */
export class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

/** 403 – authenticated but not allowed */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

/** 404 – resource not found */
export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/** 409 – conflict (e.g. duplicate email, already subscribed) */
export class ConflictError extends AppError {
  constructor(message) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}
