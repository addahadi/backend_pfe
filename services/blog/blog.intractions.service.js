import sql from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';

// ─── Toggle Like ──────────────────────────────────────────────────────────────
export const toggleLike = async (userId, articleId) => {
  const article = await sql`SELECT article_id FROM articles WHERE article_id = ${articleId}`;
  if (!article.length) {
    throw new AppError(
  'Article not found',
  'المقال غير موجود',
  'ARTICLE_NOT_FOUND',
  404
);
  }

  const existing = await sql`
    SELECT like_id FROM likes WHERE user_id = ${userId} AND article_id = ${articleId}
  `;

  if (existing.length) {
    await sql`DELETE FROM likes WHERE user_id = ${userId} AND article_id = ${articleId}`;
  } else {
    await sql`
      INSERT INTO likes (user_id, article_id)
      VALUES (${userId}, ${articleId})
    `;
  }

  const [count] = await sql`SELECT COUNT(*) as c FROM likes WHERE article_id = ${articleId}`;
  return { liked: !existing.length, likesCount: Number(count.c) };
};

// ─── Toggle Save ──────────────────────────────────────────────────────────────
export const toggleSave = async (userId, articleId) => {
  const article = await sql`SELECT article_id FROM articles WHERE article_id = ${articleId}`;
  if (!article.length) {
    throw new AppError(
  'Article not found',
  'المقال غير موجود',
  'ARTICLE_NOT_FOUND',
  404
);
  }

  const existing = await sql`
    SELECT save_id FROM saves WHERE user_id = ${userId} AND article_id = ${articleId}
  `;

  if (existing.length) {
    await sql`DELETE FROM saves WHERE user_id = ${userId} AND article_id = ${articleId}`;
  } else {
    await sql`
      INSERT INTO saves (user_id, article_id)
      VALUES (${userId}, ${articleId})
    `;
  }

  const [count] = await sql`SELECT COUNT(*) as c FROM saves WHERE article_id = ${articleId}`;
  return { saved: !existing.length, savesCount: Number(count.c) };
};