/**
 * Typed application errors.
 *
 * Every error class now accepts BOTH an English and an Arabic message.
 * The `message` property (inherited from Error) always holds the English
 * text so nothing breaks if Arabic is omitted.  The `message_ar` property
 * holds the Arabic text (falls back to English if not provided).
 *
 * The global error handler reads `res.locals.lang` (set by langMiddleware)
 * and picks the right string before sending the JSON response.
 */

export class AppError extends Error {
  /**
   * @param {string} message_en   – English error text (also sets Error.message)
   * @param {string} message_ar   – Arabic  error text (falls back to message_en)
   * @param {string} code         – Machine-readable code, e.g. 'AUTH_ERROR'
   * @param {number} [statusCode] – HTTP status code (default 500)
   */
  constructor(message_en, message_ar, code, statusCode = 500) {
    super(message_en);
    this.name       = 'AppError';
    this.message_en = message_en;
    this.message_ar = message_ar || message_en;  // graceful fallback
    this.code       = code;
    this.statusCode = statusCode;
  }
}

/** 400 – request data is wrong */
export class ValidationError extends AppError {
  constructor(message_en, message_ar, details = []) {
    super(message_en, message_ar, 'VALIDATION_ERROR', 400);
    this.name    = 'ValidationError';
    this.details = details;
  }
}

/** 401 – not authenticated */
export class AuthError extends AppError {
  constructor(message_en = 'Unauthorized', message_ar = 'غير مصرح') {
    super(message_en, message_ar, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

/** 403 – authenticated but not allowed */
export class ForbiddenError extends AppError {
  constructor(message_en = 'Forbidden', message_ar = 'ممنوع') {
    super(message_en, message_ar, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

/** 404 – resource not found */
export class NotFoundError extends AppError {
  constructor(message_en = 'Not found', message_ar = 'غير موجود') {
    super(message_en, message_ar, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/** 409 – conflict (e.g. duplicate email, already subscribed) */
export class ConflictError extends AppError {
  constructor(message_en, message_ar) {
    super(message_en, message_ar, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}
