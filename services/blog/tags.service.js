import sql from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';

// ─── List All Tags ────────────────────────────────────────────────────────────
export const getTags = async () => {
  const rows = await sql`
    SELECT
      t.tag_id,
      t.name_en,
      t.name_ar,
      COUNT(art.article_id) AS count
    FROM tags t
    LEFT JOIN article_tags art ON t.tag_id = art.tag_id
    GROUP BY t.tag_id, t.name_en, t.name_ar
    ORDER BY count DESC, t.name_en ASC
  `;
  return { data: rows };
};

// ─── Create Tag ───────────────────────────────────────────────────────────────
export const createTag = async (name_en, name_ar) => {
  if (!name_en?.trim() || !name_ar?.trim()) {
    throw new AppError('Tag names are required', 'حقل مطلوب', 'VALIDATION_ERROR', 400);
  }

  const [result] = await sql`
    INSERT INTO tags (name_en, name_ar)
    VALUES (${name_en.trim()}, ${name_ar.trim()})
    RETURNING tag_id, name_en, name_ar, created_at
  `;

  return result;
};

// ─── Delete Tag ───────────────────────────────────────────────────────────────
export const deleteTag = async (tagId) => {
  const tag = await sql`SELECT tag_id FROM tags WHERE tag_id = ${tagId}`;
  if (!tag.length) {
    // FIX: was AppError('TAG_IN_USE', 400, message) — wrong argument order.
    // AppError constructor is: (messageEn, messageAr, code, statusCode)
    throw new AppError('Tag not found', 'غير موجود', 'TAG_NOT_FOUND', 404);
  }

  const [usage] = await sql`
    SELECT COUNT(*) AS count FROM article_tags WHERE tag_id = ${tagId}
  `;

  if (Number(usage.count) > 0) {
    // FIX: same wrong argument order as above — corrected here too
    throw new AppError(
      `Cannot delete tag. It is used in ${usage.count} article(s).`,
      'لا يمكن حذف الوسم لأنه مستخدم في مقالات',
      'TAG_IN_USE',
      400
    );
  }

  await sql`DELETE FROM tags WHERE tag_id = ${tagId}`;
};