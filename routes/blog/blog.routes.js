import express from 'express';
import authenticate from '../../middelwares/authenticate.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';

import {
  createArticleSchema,
  updateArticleSchema,
  saveDraftSchema,
  createTagSchema,
} from '../../schemas/blog.schema.js';

import {
  getArticles,
  getArticle,
  getArticleBySlug,
  createArticle,
  updateArticle,
  saveDraft,
  deleteArticle,
  getRelatedArticles,
  getArticleTypes,
} from '../../controllers/blog/articles.controller.js';

import { uploadCover } from '../../controllers/blog/articles.controller.js';
import { toggleLike, toggleSave } from '../../controllers/blog/interactions.controller.js';
import { getTags, createTag, deleteTag } from '../../controllers/blog/tags.controller.js';

const router = express.Router();

// ── Security Headers Middleware ────────────────────────────────────────────────
// Applied to all blog routes
router.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Allow only safe content types in responses
  next();
});

// ── Simple in-memory rate limiter for public endpoints ────────────────────────
// Production: replace with redis-backed rate limiting (e.g. express-rate-limit + ioredis)
const rateLimitMap = new Map();
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_PUBLIC = 120; // 120 req/min for public routes
const RATE_LIMIT_AUTH = 60; // 60 req/min for authenticated routes

const createRateLimiter = (limit) => (req, res, next) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const key = `${ip}:${req.path}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + RATE_WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_WINDOW_MS;
  }

  entry.count++;
  rateLimitMap.set(key, entry);

  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - entry.count)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

  if (entry.count > limit) {
    return res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      },
    });
  }

  // Clean up old entries periodically (every 500 entries added)
  if (rateLimitMap.size > 500) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
  }

  next();
};

const publicLimiter = createRateLimiter(RATE_LIMIT_PUBLIC);
const authLimiter = createRateLimiter(RATE_LIMIT_AUTH);

// ── UUID param validation middleware ─────────────────────────────────────────
const validateUuidParam = (paramName) => (req, res, next) => {
  const val = req.params[paramName];
  if (val && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
    return res.status(400).json({
      error: { code: 'INVALID_PARAM', message: `Invalid ${paramName} format` },
    });
  }
  next();
};

// ── Article type endpoint ─────────────────────────────────────────────────────
router.get('/article-types', publicLimiter, getArticleTypes);

// ── Articles — public reads ───────────────────────────────────────────────────
router.get('/articles', publicLimiter, getArticles);
router.get(
  '/articles/slug/:slug',
  publicLimiter,
  (req, res, next) => {
    // Sanitize slug
    if (!/^[a-z0-9-]+$/.test(req.params.slug)) {
      return res.status(400).json({
        error: { code: 'INVALID_PARAM', message: 'Invalid slug format' },
      });
    }
    next();
  },
  getArticleBySlug
);
router.get('/articles/:id/related', publicLimiter, validateUuidParam('id'), getRelatedArticles);
router.get('/articles/:id', publicLimiter, validateUuidParam('id'), getArticle);

// ── Tags — public reads ───────────────────────────────────────────────────────
router.get('/tags', publicLimiter, getTags);

// ── Likes & Saves (require auth) ──────────────────────────────────────────────
router.post('/articles/:id/likes', authLimiter, authenticate, validateUuidParam('id'), toggleLike);
router.post('/articles/:id/saves', authLimiter, authenticate, validateUuidParam('id'), toggleSave);

// ── Admin Articles ────────────────────────────────────────────────────────────
router.post(
  '/articles',
  authLimiter,
  authenticate,
  requireRole('ADMIN'),
  validate(createArticleSchema),
  createArticle
);
router.put(
  '/articles/:id',
  authLimiter,
  authenticate,
  requireRole('ADMIN'),
  validateUuidParam('id'),
  validate(updateArticleSchema),
  updateArticle
);
router.patch(
  '/articles/:id/draft',
  authLimiter,
  authenticate,
  requireRole('ADMIN'),
  validateUuidParam('id'),
  validate(saveDraftSchema),
  saveDraft
);
router.delete(
  '/articles/:id',
  authLimiter,
  authenticate,
  requireRole('ADMIN'),
  validateUuidParam('id'),
  deleteArticle
);

// ── Tags admin ────────────────────────────────────────────────────────────────
router.post(
  '/tags',
  authLimiter,
  authenticate,
  requireRole('ADMIN'),
  validate(createTagSchema),
  createTag
);
router.delete(
  '/tags/:id',
  authLimiter,
  authenticate,
  requireRole('ADMIN'),
  validateUuidParam('id'),
  deleteTag
);

// ── Admin list ────────────────────────────────────────────────────────────────
router.get('/admin/articles', authLimiter, authenticate, requireRole('ADMIN'), getArticles);

export default router;
