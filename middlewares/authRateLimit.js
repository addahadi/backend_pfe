import { AppError } from '../utils/AppError.js';

/**
 * IP-based rate limiter for unauthenticated auth routes
 * (login, register, forgot-password).
 *
 * Uses an in-memory sliding-window counter keyed by IP.
 * Default: 10 requests per minute per IP.
 */

const store = new Map(); // ip → [ ...timestamps ]

export const authRateLimit = (limit = 10, windowMs = 60_000) => {
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Initialise bucket
    if (!store.has(ip)) store.set(ip, []);

    // Slide the window — drop timestamps older than windowMs
    const bucket = store.get(ip).filter((t) => now - t < windowMs);
    bucket.push(now);
    store.set(ip, bucket);

    if (bucket.length > limit) {
      const err = new AppError('Too many requests, please try again later.', 'RATE_LIMIT', 429);
      err.details = [{ retryAfter: Math.ceil(windowMs / 1000) }];
      return next(err);
    }

    next();
  };
};
