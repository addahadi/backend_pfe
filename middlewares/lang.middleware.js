/**
 * Language Middleware
 *
 * Reads the `x-lang` header from the request (sent by the frontend).
 * Sets `res.locals.lang` to `'ar'` or `'en'` so that every downstream
 * handler — controllers, services via handleError — can return the
 * correct language in error messages and success responses.
 *
 * Frontend sends:   x-lang: ar   OR   x-lang: en
 * Fallback default: 'en'
 */
export function langMiddleware(req, res, next) {
  const requested = req.headers['x-lang'];
  res.locals.lang = requested === 'ar' ? 'ar' : 'en';
  next();
}
