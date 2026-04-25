import { z } from 'zod';

// 📰 Create Article
export const createArticleSchema = z.object({
  title_en: z.string().min(3).max(200),
  title_ar: z.string().min(3).max(200),
  article_type_id: z.string().uuid().optional(),
  excerpt_en: z.string().max(200).optional(),
  excerpt_ar: z.string().max(200).optional(),
  cover_img: z.string().url().optional(),
  content_en: z.any().optional(), // Lexical JSON
  content_ar: z.any().optional(), // Lexical JSON
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  tags: z.array(z.string().uuid()).optional(),
});

// ✏️ Update Article
export const updateArticleSchema = z.object({
  title_en: z.string().min(3).max(200).optional(),
  title_ar: z.string().min(3).max(200).optional(),
  article_type_id: z.string().uuid().optional(),
  excerpt_en: z.string().max(200).optional(),
  excerpt_ar: z.string().max(200).optional(),
  cover_img: z.string().url().optional(),
  content_en: z.any().optional(),
  content_ar: z.any().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  tags: z.array(z.string().uuid()).optional(),
});

// 💾 Save Draft
export const saveDraftSchema = z.object({
  title_en: z.string().optional(),
  title_ar: z.string().optional(),
  excerpt_en: z.string().max(200).optional(),
  excerpt_ar: z.string().max(200).optional(),
  content_en: z.any().optional(),
  content_ar: z.any().optional(),
  cover_img: z.string().url().optional(),
  tags: z.array(z.string().uuid()).optional(),
});

// 🏷️ Create Tag
export const createTagSchema = z.object({
  name_en: z.string().min(1).max(100),
  name_ar: z.string().min(1).max(100),
});
