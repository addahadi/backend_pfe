import { ZodError } from 'zod';
import { AppError } from './AppError.js';

// ─── Success ──────────────────────────────────────────────────────────────────

/**
 * Send a structured success response.
 * @param {import('express').Response} res
 * @param {*} data
 * @param {number} [status=200]
 */
export function ok(res, data, status = 200) {
  res.status(status).json({ success: true, data });
}

// ─── Not-found shorthand ──────────────────────────────────────────────────────

/**
 * Send a structured 404 response.
 * @param {import('express').Response} res
 * @param {string} message
 */
export function notFound(res, message) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message },
  });
}

// ─── Error handler ────────────────────────────────────────────────────────────

/**
 * Map any thrown error to a structured JSON response.
 *
 * Codes:
 *   VALIDATION_ERROR  400  – Zod or ValidationError
 *   AUTH_ERROR        401  – AuthError
 *   FORBIDDEN         403  – ForbiddenError
 *   NOT_FOUND         404  – NotFoundError
 *   CONFLICT          409  – ConflictError
 *   <custom code>     4xx  – any other AppError subclass
 *   INTERNAL_ERROR    500  – anything else
 *
 * @param {import('express').Response} res
 * @param {unknown} err
 */
export function handleError(res, err) {
  if (err instanceof ZodError || err.name === 'ZodError') {
    const issues = err.issues || err.errors || [];
    return res.status(400).json({
      success: false,
      error: {
        code:    'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: issues.map(e => ({
          field:   e.path ? e.path.join('.') : 'unknown',
          message: e.message,
        })),
      },
    });
  }

  // ── Known application error ───────────────────────────────────────────────
  if (err instanceof AppError) {
    const body = {
      success: false,
      error: {
        code:    err.code,
        message: err.message,
      },
    };
    // Attach details if present (e.g. ValidationError)
    if (err.details?.length) body.error.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  // ── Fallback: unexpected server error ─────────────────────────────────────
  console.error('[Server Error]', err);
  return res.status(500).json({
    success: false,
    error: {
      code:    'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
