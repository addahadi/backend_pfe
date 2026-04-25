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
  getArticleTypes, // ← حطها هنا
} from '../../controllers/blog/articles.controller.js';

import { uploadCover } from '../../controllers/blog/articles.controller.js';
import { toggleLike, toggleSave } from '../../controllers/blog/interactions.controller.js';
import { getTags, createTag, deleteTag } from '../../controllers/blog/tags.controller.js';

// 🔥 لازم يكون قبل أي router.get
const router = express.Router();


// ── Articles types ─────────────────────────────
router.get('/article-types', getArticleTypes);


// ── Articles — public reads ─────────────────────
router.get('/articles', getArticles);
router.get('/articles/slug/:slug', getArticleBySlug);
router.get('/articles/:id/related', getRelatedArticles);
router.get('/articles/:id', getArticle);

// ── Tags — public reads ─────────────────────────
router.get('/tags', getTags);

// ── Likes & Saves ──────────────────────────────
router.post('/articles/:id/likes', authenticate, toggleLike);
router.post('/articles/:id/saves', authenticate, toggleSave);

// ── Admin Articles ─────────────────────────────
router.post('/articles', authenticate, requireRole('ADMIN'), validate(createArticleSchema), createArticle);
router.put('/articles/:id', authenticate, requireRole('ADMIN'), validate(updateArticleSchema), updateArticle);
router.patch('/articles/:id/draft', authenticate, requireRole('ADMIN'), validate(saveDraftSchema), saveDraft);
router.delete('/articles/:id', authenticate, requireRole('ADMIN'), deleteArticle);

// ── Tags admin ─────────────────────────────────
router.post('/tags', authenticate, requireRole('ADMIN'), validate(createTagSchema), createTag);
router.delete('/tags/:id', authenticate, requireRole('ADMIN'), deleteTag);

// ── Admin list ─────────────────────────────────
router.get('/admin/articles', authenticate, requireRole('ADMIN'), getArticles);

export default router;