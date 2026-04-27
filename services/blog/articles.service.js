import sql from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { randomUUID } from 'crypto';

// ─── Type Cache (TTL-based, not forever) ─────────────────────────────────────
let typeCache = null;
let typeCacheExpiry = 0;
const TYPE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const getTypeIds = async () => {
  const now = Date.now();
  if (typeCache && now < typeCacheExpiry) return typeCache;

  const rows = await sql`SELECT article_type_id, name_en FROM article_types`;
  typeCache = {};
  for (const r of rows) {
    typeCache[r.name_en.toUpperCase()] = r.article_type_id;
  }
  typeCacheExpiry = now + TYPE_CACHE_TTL_MS;
  return typeCache;
};

// Invalidate cache (called after create/update so fresh data is returned)
export const invalidateTypeCache = () => {
  typeCache = null;
  typeCacheExpiry = 0;
};

// Resolve a human-readable type name to its DB UUID
const resolveTypeId = async (typeString) => {
  if (!typeString) return null;
  try {
    const types = await getTypeIds();
    const key = typeString.toUpperCase().trim();
    if (types[key]) return types[key];
    // Try partial match (e.g. "actualité" → ACTUALITE)
    const partialKey = Object.keys(types).find((k) =>
      key.includes(k) || k.includes(key)
    );
    if (partialKey) return types[partialKey];
    return null;
  } catch (err) {
    console.error('❌ resolveTypeId error:', err);
    return null;
  }
};

// ─── Slug ─────────────────────────────────────────────────────────────────────
const slugify = (text) => {
  if (!text) return 'untitled-' + randomUUID().slice(0, 6);
  return (
    text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .substring(0, 180) +
    '-' +
    randomUUID().slice(0, 6)
  );
};

// ─── Sanitize content (basic XSS-safe guard before DB insert) ────────────────
const sanitizeJsonContent = (content) => {
  if (!content) return null;
  if (typeof content === 'string') {
try {
  return JSON.parse(content);
} catch (e) {
  throw new AppError(
    'Invalid JSON content',
    'محتوى غير صالح',
    'VALIDATION_ERROR',
    400
  );
}
  }
  if (typeof content === 'object') return content;
  return null;
};

// ─── List Articles ────────────────────────────────────────────────────────────
export const getArticles = async ({
  search,
  type,
  tag,
  status,
  page = 1,
  limit = 9,
}) => {
  const offset = (Number(page) - 1) * Number(limit);

  const searchFilter = search
    ? sql`AND (
        a.title_en ILIKE ${'%' + search + '%'} OR
        a.title_ar ILIKE ${'%' + search + '%'} OR
        a.excerpt_en ILIKE ${'%' + search + '%'} OR
        a.excerpt_ar ILIKE ${'%' + search + '%'}
      )`
    : sql``;

  // type filter: accepts either a UUID or a human name like "BLOG"
  let typeFilter = sql``;
  if (type) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(type);
    if (isUuid) {
      typeFilter = sql`AND a.article_type_id = ${type}`;
    } else {
      const resolvedId = await resolveTypeId(type);
      if (resolvedId) {
        typeFilter = sql`AND a.article_type_id = ${resolvedId}`;
      }
    }
  }

  const tagFilter = tag
    ? sql`AND EXISTS (
        SELECT 1 FROM article_tags at2
        WHERE at2.article_id = a.article_id AND at2.tag_id = ${tag}
      )`
    : sql``;

  const statusFilter =
    status && status !== 'ALL'
      ? sql`AND a.status = ${status}`
      : sql``;

  const [countRes] = await sql`
    SELECT COUNT(*) as total
    FROM articles a
    WHERE 1=1
    ${statusFilter}
    ${searchFilter}
    ${typeFilter}
    ${tagFilter}
  `;
  const total = Number(countRes.total);

  const articles = await sql`
    SELECT
      a.article_id, a.title_en, a.title_ar, a.slug,
      a.excerpt_en, a.excerpt_ar,
      a.cover_img, a.status, a.published_at,
      a.created_at, a.updated_at,
      a.article_type_id,
      at_type.name_en AS type_name_en,
      at_type.name_ar AS type_name_ar
    FROM articles a
    LEFT JOIN article_types at_type
      ON a.article_type_id = at_type.article_type_id
    WHERE 1=1
    ${statusFilter}
    ${searchFilter}
    ${typeFilter}
    ${tagFilter}
    ORDER BY a.created_at DESC
    LIMIT ${Number(limit)} OFFSET ${offset}
  `;

  if (articles.length > 0) {
    const articleIds = articles.map((a) => a.article_id);

    const tagRows = await sql`
      SELECT art.article_id, t.tag_id, t.name_en, t.name_ar
      FROM article_tags art
      JOIN tags t ON art.tag_id = t.tag_id
      WHERE art.article_id IN ${sql(articleIds)}
    `;

    const likeRows = await sql`
      SELECT article_id, COUNT(*) as c
      FROM likes
      WHERE article_id IN ${sql(articleIds)}
      GROUP BY article_id
    `;

    const saveRows = await sql`
      SELECT article_id, COUNT(*) as c
      FROM saves
      WHERE article_id IN ${sql(articleIds)}
      GROUP BY article_id
    `;

    const tagsByArticle = {};
    for (const row of tagRows) {
      if (!tagsByArticle[row.article_id]) tagsByArticle[row.article_id] = [];
      tagsByArticle[row.article_id].push({
        tag_id: row.tag_id,
        name_en: row.name_en,
        name_ar: row.name_ar,
      });
    }

    const likesByArticle = {};
    for (const row of likeRows) likesByArticle[row.article_id] = Number(row.c);

    const savesByArticle = {};
    for (const row of saveRows) savesByArticle[row.article_id] = Number(row.c);

    for (const article of articles) {
      article.tags = tagsByArticle[article.article_id] || [];
      article.likesCount = likesByArticle[article.article_id] || 0;
      article.savesCount = savesByArticle[article.article_id] || 0;
      article.created_at = article.created_at?.toISOString().split('T')[0];
      article.updated_at = article.updated_at?.toISOString().split('T')[0];
      article.published_at = article.published_at?.toISOString().split('T')[0] ?? null;
    }
  }

  return {
    data: articles,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// ─── Get Single Article ───────────────────────────────────────────────────────
export const getArticleById = async (articleId) => {
  const rows = await sql`
    SELECT
      a.article_id, a.title_en, a.title_ar, a.slug, a.excerpt_en, a.excerpt_ar,
      a.content_en, a.content_ar, a.cover_img, a.status, a.published_at,
      a.created_at, a.updated_at, a.article_type_id,
      at_type.name_en AS type_name_en,
      at_type.name_ar AS type_name_ar
    FROM articles a
    LEFT JOIN article_types at_type ON a.article_type_id = at_type.article_type_id
    WHERE a.article_id = ${articleId}
  `;
  if (!rows.length) return null;

  const article = rows[0];

  const tags = await sql`
    SELECT t.tag_id, t.name_en, t.name_ar
    FROM tags t
    JOIN article_tags art ON t.tag_id = art.tag_id
    WHERE art.article_id = ${articleId}
  `;

  const [likes] = await sql`SELECT COUNT(*) as c FROM likes WHERE article_id = ${articleId}`;
  const [saves] = await sql`SELECT COUNT(*) as c FROM saves WHERE article_id = ${articleId}`;

  return {
    ...article,
    type: article.type_name_en || null,
    type_name_en: article.type_name_en || null,
    type_name_ar: article.type_name_ar || null,
    tags,
    likesCount: Number(likes.c),
    savesCount: Number(saves.c),
    created_at: article.created_at?.toISOString().split('T')[0],
    updated_at: article.updated_at?.toISOString().split('T')[0],
    published_at: article.published_at?.toISOString().split('T')[0] ?? null,
  };
};

export const getArticleBySlug = async (slug) => {
  const rows = await sql`SELECT article_id FROM articles WHERE slug = ${slug}`;
  if (!rows.length) return null;
  return getArticleById(rows[0].article_id);
};

// ─── Create ───────────────────────────────────────────────────────────────────
export const createArticle = async (data) => {
  if (data.status === 'PUBLISHED') {
    const errors = {};
    if (!data.title_en || data.title_en.length < 3) errors.title_en = 'English title required (min 3 chars)';
    if (!data.title_ar || data.title_ar.length < 3) errors.title_ar = 'Arabic title required (min 3 chars)';
    if (!data.excerpt_en) errors.excerpt_en = 'English excerpt is required';
    if (!data.excerpt_ar) errors.excerpt_ar = 'Arabic excerpt is required';
    if (!data.cover_img) errors.cover_img = 'Cover image is required for publishing';
    if (!data.content_en) errors.content_en = 'English content is required for publishing';
    if (!data.content_ar) errors.content_ar = 'Arabic content is required for publishing';
    if (Object.keys(errors).length > 0) {
     throw new AppError(
  'Missing required fields for publishing',
  'حقول ناقصة للنشر',
  'VALIDATION_ERROR',
  400
);
    }
  } else {
    if (!data.title_en || data.title_en.length < 1) {
      throw new AppError('English title is required','عنوان مطلوب','VALIDATION_ERROR', 400, );
    }
    if (!data.title_ar || data.title_ar.length < 1) {
     throw new AppError('English title is required','عنوان مطلوب','VALIDATION_ERROR', 400, );
    }
  }

  // Resolve article_type_id: accept UUID directly OR resolve from name
  let typeId = null;
  if (data.article_type_id) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.article_type_id);
    if (isUuid) {
      // Validate UUID exists in DB
      const check = await sql`SELECT article_type_id FROM article_types WHERE article_type_id = ${data.article_type_id}`;
      typeId = check.length ? data.article_type_id : null;
    } else {
      typeId = await resolveTypeId(data.article_type_id);
    }
  } else if (data.type) {
    typeId = await resolveTypeId(data.type);
  }

  // Fallback: use first available type
  if (!typeId) {
    const first = await sql`SELECT article_type_id FROM article_types ORDER BY name_en LIMIT 1`;
    typeId = first.length ? first[0].article_type_id : null;
  }

  const slug = slugify(data.title_en || 'untitled');
  const contentEn = sanitizeJsonContent(data.content_en);
  const contentAr = sanitizeJsonContent(data.content_ar);

  const [inserted] = await sql`
    INSERT INTO articles (
      article_type_id, title_en, title_ar, slug,
      excerpt_en, excerpt_ar, content_en, content_ar,
      cover_img, status, published_at
    ) VALUES (
      ${typeId},
      ${data.title_en.trim()},
      ${data.title_ar.trim()},
      ${slug},
      ${data.excerpt_en?.trim() || null},
      ${data.excerpt_ar?.trim() || null},
      ${contentEn ? sql.json(contentEn) : null},
      ${contentAr ? sql.json(contentAr) : null},
      ${data.cover_img || null},
      ${data.status || 'DRAFT'},
      ${data.status === 'PUBLISHED' ? sql`NOW()` : null}
    )
    RETURNING article_id, title_en, title_ar, slug, status, created_at
  `;

  if (data.tags?.length > 0) {
    const tagValues = data.tags.map((tagId) => ({
      article_id: inserted.article_id,
      tag_id: tagId,
    }));
    await sql`INSERT INTO article_tags ${sql(tagValues, 'article_id', 'tag_id')}`;
  }

return await getArticleById(inserted.article_id);
};

// ─── Update ───────────────────────────────────────────────────────────────────
export const updateArticle = async (articleId, data) => {
  const existingRows = await sql`SELECT * FROM articles WHERE article_id = ${articleId}`;
  if (!existingRows.length) throw new AppError('Article not found','مقال غير موجود','ARTICLE_NOT_FOUND', 404 );
  const existing = existingRows[0];

  if (data.status === 'PUBLISHED') {
    const errors = {};
    const title_en   = data.title_en   ?? existing.title_en;
    const title_ar   = data.title_ar   ?? existing.title_ar;
    const excerpt_en = data.excerpt_en ?? existing.excerpt_en;
    const excerpt_ar = data.excerpt_ar ?? existing.excerpt_ar;
    const cover      = data.cover_img  ?? existing.cover_img;
    const content_en = data.content_en ?? existing.content_en;
    const content_ar = data.content_ar ?? existing.content_ar;

    if (!title_en || title_en.length < 3) errors.title_en = 'English title required for publishing';
    if (!title_ar || title_ar.length < 3) errors.title_ar = 'Arabic title required for publishing';
    if (!excerpt_en) errors.excerpt_en = 'English excerpt required for publishing';
    if (!excerpt_ar) errors.excerpt_ar = 'Arabic excerpt required for publishing';
    if (!cover)      errors.cover_img  = 'Cover image required for publishing';
    if (!content_en) errors.content_en = 'English content required for publishing';
    if (!content_ar) errors.content_ar = 'Arabic content required for publishing';

    if (Object.keys(errors).length > 0) {
      throw new AppError('Cannot publish: missing required fields.','لا يمكن النشر','INVALID_STATUS_CHANGE', 400);
    }
  }

  const patch = {};
  if (data.title_en !== undefined) {
    patch.title_en = data.title_en.trim();
    patch.slug = slugify(data.title_en);
  }
  if (data.title_ar !== undefined) patch.title_ar = data.title_ar.trim();

  // Resolve type
  if (data.article_type_id !== undefined) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.article_type_id);
    if (isUuid) {
      const check = await sql`SELECT article_type_id FROM article_types WHERE article_type_id = ${data.article_type_id}`;
      patch.article_type_id = check.length ? data.article_type_id : existing.article_type_id;
    } else if (data.article_type_id) {
      patch.article_type_id = (await resolveTypeId(data.article_type_id)) ?? existing.article_type_id;
    }
  } else if (data.type !== undefined) {
    const resolved = await resolveTypeId(data.type);
    if (resolved) patch.article_type_id = resolved;
  }

  if (data.excerpt_en  !== undefined) patch.excerpt_en  = data.excerpt_en.trim();
  if (data.excerpt_ar  !== undefined) patch.excerpt_ar  = data.excerpt_ar.trim();
  if (data.cover_img   !== undefined) patch.cover_img   = data.cover_img;

  if (data.content_en !== undefined) {
    const c = sanitizeJsonContent(data.content_en);
    patch.content_en = c ? sql.json(c) : null;
  }
  if (data.content_ar !== undefined) {
    const c = sanitizeJsonContent(data.content_ar);
    patch.content_ar = c ? sql.json(c) : null;
  }

  if (data.status !== undefined) {
    patch.status = data.status;
    if (data.status === 'PUBLISHED' && !existing.published_at) {
      patch.published_at = new Date();
    }
  }

  if (Object.keys(patch).length > 0) {
    await sql`
      UPDATE articles
      SET ${sql(patch)}, updated_at = NOW()
      WHERE article_id = ${articleId}
    `;
  }

  if (data.tags !== undefined) {
    await sql`DELETE FROM article_tags WHERE article_id = ${articleId}`;
    if (Array.isArray(data.tags) && data.tags.length > 0) {
      const tagValues = data.tags.map((tagId) => ({
        article_id: articleId,
        tag_id: tagId,
      }));
      await sql`INSERT INTO article_tags ${sql(tagValues, 'article_id', 'tag_id')}`;
    }
  }

  return getArticleById(articleId);
};

// ─── Save Draft ───────────────────────────────────────────────────────────────
// ─── Save Draft ───────────────────────────────────────────────────────────────
// FIX: was AppError('ARTICLE_NOT_FOUND', 404, 'Article not found') — wrong order.
// AppError constructor is: (messageEn, messageAr, code, statusCode)
// Only the saveDraft function had this bug; the rest of articles_service.js is correct.
// Replace only the saveDraft function in your articles_service.js:

export const saveDraft = async (articleId, data) => {
  const existingRows = await sql`SELECT article_id FROM articles WHERE article_id = ${articleId}`;
  if (!existingRows.length) {
    throw new AppError('Article not found', 'مقال غير موجود', 'ARTICLE_NOT_FOUND', 404);
  }

  const patch = { status: 'DRAFT' };
  if (data.title_en   !== undefined) { patch.title_en = data.title_en.trim(); patch.slug = slugify(data.title_en); }
  if (data.title_ar   !== undefined) patch.title_ar   = data.title_ar.trim();
  if (data.excerpt_en !== undefined) patch.excerpt_en = data.excerpt_en.trim();
  if (data.excerpt_ar !== undefined) patch.excerpt_ar = data.excerpt_ar.trim();
  if (data.content_en !== undefined) {
    const c = sanitizeJsonContent(data.content_en);
    patch.content_en = c ? sql.json(c) : null;
  }
  if (data.content_ar !== undefined) {
    const c = sanitizeJsonContent(data.content_ar);
    patch.content_ar = c ? sql.json(c) : null;
  }
  if (data.cover_img !== undefined) patch.cover_img = data.cover_img;

  await sql`
    UPDATE articles
    SET ${sql(patch)}, updated_at = NOW()
    WHERE article_id = ${articleId}
  `;

  if (data.tags !== undefined) {
    await sql`DELETE FROM article_tags WHERE article_id = ${articleId}`;
    if (Array.isArray(data.tags) && data.tags.length > 0) {
      const tagValues = data.tags.map((tagId) => ({
        article_id: articleId,
        tag_id: tagId,
      }));
      await sql`INSERT INTO article_tags ${sql(tagValues, 'article_id', 'tag_id')}`;
    }
  }

  return {
    article_id: articleId,
    status: 'DRAFT',
    updated_at: new Date().toISOString(),
    saved_as_draft: true,
  };
};
// ─── Delete ───────────────────────────────────────────────────────────────────
export const deleteArticle = async (articleId) => {
  const existingRows = await sql`SELECT article_id FROM articles WHERE article_id = ${articleId}`;
  if (!existingRows.length) throw new AppError('ARTICLE_NOT_FOUND', 404, 'Article not found');

  await sql`DELETE FROM article_tags WHERE article_id = ${articleId}`;
  await sql`DELETE FROM likes WHERE article_id = ${articleId}`;
  await sql`DELETE FROM saves WHERE article_id = ${articleId}`;
  await sql`DELETE FROM articles WHERE article_id = ${articleId}`;
};

// ─── Related Articles ─────────────────────────────────────────────────────────
export const getRelatedArticles = async (articleId, limit = 3) => {
  const current = await sql`SELECT article_id FROM articles WHERE article_id = ${articleId}`;
  if (!current.length) throw new AppError('Article not found','مقال غير موجود','ARTICLE_NOT_FOUND', 404 );

  const currentTags = await sql`SELECT tag_id FROM article_tags WHERE article_id = ${articleId}`;
  const tagIds = currentTags.map((t) => t.tag_id);

  if (!tagIds.length) {
    const recent = await sql`
      SELECT article_id, title_en, title_ar, slug, excerpt_en, excerpt_ar, cover_img, created_at, content_en
      FROM articles
      WHERE article_id != ${articleId} AND status = 'PUBLISHED'
      ORDER BY created_at DESC
      LIMIT ${Number(limit)}
    `;

    return {
      data: recent.map((a) => ({
        article_id: a.article_id,
        title_en: a.title_en,
        title_ar: a.title_ar,
        slug: a.slug,
        excerpt_en: a.excerpt_en,
        excerpt_ar: a.excerpt_ar,
        cover_img: a.cover_img,
        reading_time: Math.max(1, Math.round(JSON.stringify(a.content_en || {}).length / 1000)),
        shared_tags: [],
        shared_tags_count: 0,
        relevance_score: 0,
        created_at: a.created_at?.toISOString().split('T')[0],
      })),
      meta: { is_fallback: true, total_matches: recent.length },
    };
  }

  const related = await sql`
    SELECT
      a.article_id, a.title_en, a.title_ar, a.slug, a.excerpt_en, a.excerpt_ar,
      a.cover_img, a.created_at, a.content_en,
      COUNT(art.tag_id) AS shared_count,
      STRING_AGG(DISTINCT t.name_en, ',') AS shared_tag_names_en
    FROM articles a
    JOIN article_tags art ON a.article_id = art.article_id
    JOIN tags t ON art.tag_id = t.tag_id
    WHERE a.article_id != ${articleId}
      AND a.status = 'PUBLISHED'
      AND art.tag_id IN ${sql(tagIds)}
    GROUP BY a.article_id, a.title_en, a.title_ar, a.slug, a.excerpt_en, a.excerpt_ar, a.cover_img, a.created_at, a.content_en
    ORDER BY shared_count DESC, a.created_at DESC
    LIMIT ${Number(limit)}
  `;

  const data = related.map((a) => {
    const daysOld = Math.floor((Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return {
      article_id: a.article_id,
      title_en: a.title_en,
      title_ar: a.title_ar,
      slug: a.slug,
      excerpt_en: a.excerpt_en,
      excerpt_ar: a.excerpt_ar,
      cover_img: a.cover_img,
      reading_time: Math.max(1, Math.round(JSON.stringify(a.content_en || {}).length / 1000)),
      shared_tags: a.shared_tag_names_en ? a.shared_tag_names_en.split(',').slice(0, 2) : [],
      shared_tags_count: Number(a.shared_count),
      relevance_score: Number(a.shared_count) + (daysOld < 30 ? 0.5 : 0),
      created_at: a.created_at?.toISOString().split('T')[0],
    };
  });

  return {
    data,
    meta: { is_fallback: false, total_matches: data.length },
  };
};

// ─── Get Article Types ─────────────────────────────────────────────────────────
export const getArticleTypes = async () => {
  const rows = await sql`SELECT article_type_id, name_en, name_ar FROM article_types ORDER BY name_en`;
  return rows.map((r) => ({
    id: r.article_type_id,
    article_type_id: r.article_type_id,
    name_en: r.name_en,
    name_ar: r.name_ar,
  }));
};