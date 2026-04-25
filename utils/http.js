import { AppError } from './AppError.js';

import { z } from 'zod';
const ZodError = z.ZodError;

// ─── Language helper ──────────────────────────────────────────────────────────

/**
 * Pick the correct message string based on `res.locals.lang`.
 * Falls back to English when Arabic text is unavailable.
 *
 * @param {import('express').Response} res
 * @param {string} message_en
 * @param {string} [message_ar]
 * @returns {string}
 */
function pickMessage(res, message_en, message_ar) {
  if (res.locals?.lang === 'ar' && message_ar) return message_ar;
  return message_en;
}

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
 * @param {string} message_en
 * @param {string} [message_ar]
 */
export function notFound(res, message_en, message_ar) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: pickMessage(res, message_en, message_ar) },
  });
}

// ─── Error handler ────────────────────────────────────────────────────────────

/**
 * Map any thrown error to a structured JSON response.
 * Respects `res.locals.lang` ('en' | 'ar') to localise the message.
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
  const lang = res.locals?.lang || 'en';

  if (err instanceof ZodError || err.name === 'ZodError') {
    const issues = err.issues || err.errors || [];
    return res.status(400).json({
      success: false,
      error: {
        code:    'VALIDATION_ERROR',
        message: lang === 'ar' ? 'بيانات الطلب غير صحيحة' : 'Invalid request data',
        details: issues.map(e => ({
          field:   e.path ? e.path.join('.') : 'unknown',
          message: e.message,
        })),
      },
    });
  }

  // ── Known application error ───────────────────────────────────────────────
  if (err instanceof AppError) {
    // Pick localised message: AppError now carries message_en + message_ar
    const message = lang === 'ar'
      ? (err.message_ar || err.message)
      : (err.message_en || err.message);

    const body = {
      success: false,
      error: { code: err.code, message },
    };
    // Attach field-level details if present (e.g. ValidationError)
    if (err.details?.length) body.error.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  // ── Fallback: unexpected server error ─────────────────────────────────────
  console.error('[Server Error]', err);
  return res.status(500).json({
    success: false,
    error: {
      code:    'INTERNAL_ERROR',
      message: lang === 'ar' ? 'حدث خطأ غير متوقع في الخادم' : 'An unexpected server error occurred',
      stack: err.stack,
    },
  });
}
