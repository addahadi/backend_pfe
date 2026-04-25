import sql from '../../config/database.js';
import { AppError } from '../../utils/AppError.js'; 
import { randomUUID } from 'crypto';


let typeCache = null; 

// في بداية services/blog/articles.service.js

// ⚠️ هذه المعرفات الافتراضية (fallback) يجب أن تكون مطابقة لـ ArticleEditor.jsx
const FALLBACK_TYPE_IDS = {
  'BLOG': '11111111-1111-1111-1111-111111111111',
  'ACTUALITE': '22222222-2222-2222-2222-222222222222',
  'NEWS': '22222222-2222-2222-2222-222222222222', // مرادف لـ ACTUALITE
};

// دالة مساعدة لتحويل UUID إلى اسم النوع (للاستخدام في getArticles)
const getFallbackTypeName = (typeId) => {
  if (!typeId) return 'BLOG'; // افتراضي
  
  if (typeId === FALLBACK_TYPE_IDS['BLOG']) return 'BLOG';
  if (typeId === FALLBACK_TYPE_IDS['ACTUALITE'] || typeId === FALLBACK_TYPE_IDS['NEWS']) return 'ACTUALITE';
  
  return 'BLOG'; // افتراضي
}; 

// Cache type UUIDs once
const getTypeIds = async () => {
  if (typeCache) return typeCache;
  const rows = await sql`SELECT article_type_id, name_en FROM article_types`;
  typeCache = {};
  for (const r of rows) {
    typeCache[r.name_en.toUpperCase()] = r.article_type_id;
  }
  return typeCache;
};

const resolveTypeId = async (typeString) => {
  try {
    const types = await getTypeIds();
    const key = typeString?.toUpperCase() || 'BLOG';
    
    // 1. البحث في الكاش المحمل من القاعدة
    if (types[key]) {
      console.log(`✅ Found type "${key}" in DB`);
      return types[key];
    }
    
    // 2. إذا لم يُعثر، نرجع null مباشرة (مسموح به في قاعدة البيانات)
    // هذا يتجنب خطأ Foreign Key ويمنح التطبيق المرونة في المشاريع المشتركة
    console.warn(`⚠️ Type "${key}" not found in article_types. Saving with null article_type_id.`);
    return null;
  } catch (err) {
    console.error('❌ Error resolving article type:', err);
    return null;
  }
};

// ─── Guard against null/empty text ───────────────────────────────────────────
const slugify = (text) => {
  if (!text) return 'untitled-' + randomUUID().slice(0, 6);
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .substring(0, 200) + '-' + randomUUID().slice(0, 6);
};

// ─── List: Pagination + Search + Filters ─────────────────────────────────────
// services/blog/articles.service.js
// services/blog/articles.service.js
export const getArticles = async ({ search, type, tag, status, page = 1, limit = 9 }) => { 
  console.log('🔍 getArticles called with params:', { search, type, tag, status, page, limit });

  const offset = (Number(page) - 1) * Number(limit);

  const searchFilter = search
    ? sql`AND (
        a.title_en ILIKE ${'%' + search + '%'} OR
        a.title_ar ILIKE ${'%' + search + '%'} OR
        a.excerpt_en ILIKE ${'%' + search + '%'} OR
        a.excerpt_ar ILIKE ${'%' + search + '%'}
      )`
    : sql``;

 const typeFilter = type
  ? sql`AND a.article_type_id = ${type}`
  : sql``;

  const tagFilter = tag
    ? sql`AND EXISTS (
        SELECT 1 FROM article_tags at2
        WHERE at2.article_id = a.article_id
        AND at2.tag_id = ${tag}
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
      -- ✅ نستخدم LEFT JOIN كما هو، لكن نضيف عموداً احتياطياً
      at_type.name_en AS type_name_en_from_db,
      at_type.name_ar AS type_name_ar_from_db
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

  // ✅ الحل الذكي: نُكمل البيانات محلياً إذا لم تكن من قاعدة البيانات
  for (const article of articles) {
    // إذا لم يُرجع JOIN اسم النوع، نحسبه محلياً
    if (!article.type_name_en_from_db && article.article_type_id) {
      const fallbackName = getFallbackTypeName(article.article_type_id);
      if (fallbackName) {
        article.type_name_en = fallbackName;
        // اختياري: يمكنك إضافة العربية بناءً على الاسم
        article.type_name_ar = fallbackName === 'BLOG' ? 'مدونة' : 'Actualité';
      } else {
        article.type_name_en = 'BLOG'; // افتراضي
        article.type_name_ar = 'مدونة';
      }
    } else {
      // إذا كان الـ JOIN ناجحاً، نحتفظ بالقيم الأصلية
      article.type_name_en = article.type_name_en_from_db;
      article.type_name_ar = article.type_name_ar_from_db;
    }
    // حذف الحقول المؤقتة لتجنب الازعاج
    delete article.type_name_en_from_db;
    delete article.type_name_ar_from_db;
  }

  // ✅ الآن نطبع النتيجة *بعد* المعالجة
  console.log('📝 Articles after fallback logic:', articles.map(a => ({
    article_id: a.article_id,
    title_en: a.title_en,
    article_type_id: a.article_type_id,
    type_name_en: a.type_name_en // ← هذا هو الحقل النهائي الذي سيرجع للـ Frontend
  })));

  if (articles.length > 0) {
    const articleIds = articles.map(a => a.article_id);

    const tagRows = await sql`
      SELECT art.article_id, t.tag_id, t.name_en, t.name_ar
      FROM article_tags art
      JOIN tags t ON art.tag_id = t.tag_id
      WHERE art.article_id IN ${sql(articleIds)}
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

    for (const article of articles) {
      article.tags = tagsByArticle[article.article_id] || [];
      article.created_at = article.created_at?.toISOString().split('T')[0];
      article.updated_at = article.updated_at?.toISOString().split('T')[0];
      article.published_at = article.published_at?.toISOString().split('T')[0] ?? null;
    }
  }

  return {
    data: articles, // ✅ تأكد من أنك تُرجع data: articles
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
    // FIX: expose type_name_en as `type` so frontend mapArticle works correctly
    type: article.type_name_en || null,
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
    if (!data.title_en || data.title_en.length < 5) errors.title_en = 'English title is required (min 5 chars)';
    if (!data.title_ar || data.title_ar.length < 5) errors.title_ar = 'Arabic title is required (min 5 chars)';
    if (!data.excerpt_en) errors.excerpt_en = 'English excerpt is required';
    if (!data.excerpt_ar) errors.excerpt_ar = 'Arabic excerpt is required';
    if (!data.cover_img) errors.cover_img = 'Cover image is required for publishing';
    if (!data.content_en) errors.content_en = 'English content is required for publishing';
    if (!data.content_ar) errors.content_ar = 'Arabic content is required for publishing';
    if (Object.keys(errors).length > 0) {
      throw new AppError('VALIDATION_ERROR', 400, 'Invalid input data', errors);
    }
  } else {
    if (!data.title_en || data.title_en.length < 1) {
      throw new AppError('VALIDATION_ERROR', 400, 'English title is required');
    }
    if (!data.title_ar || data.title_ar.length < 1) {
      throw new AppError('VALIDATION_ERROR', 400, 'Arabic title is required');
    }
  }

  const slug = slugify(data.title_en || 'untitled');

  // Resolve type: prefer article_type_id UUID if provided, else resolve from name string
 let typeId = data.article_type_id;


  const [inserted] = await sql`
  INSERT INTO articles (
    article_type_id, title_en, title_ar, slug,
    excerpt_en, excerpt_ar, content_en, content_ar,
    cover_img, status, published_at
  ) VALUES (
    ${typeId || null}, -- ✅ تحويل صريح إلى null إذا لزم الأمر
    ${data.title_en || 'Untitled'},
    ${data.title_ar || 'بدون عنوان'},
    ${slug},
    ${data.excerpt_en || null},
    ${data.excerpt_ar || null},
    ${data.content_en ? sql.json(data.content_en) : null},
    ${data.content_ar ? sql.json(data.content_ar) : null},
    ${data.cover_img || null},
    ${data.status || 'DRAFT'},
    ${data.status === 'PUBLISHED' ? sql`NOW()` : null}
  )
  RETURNING article_id, title_en, title_ar, slug, status, created_at
`;

  if (data.tags?.length > 0) {
    const tagValues = data.tags.map(tagId => ({ article_id: inserted.article_id, tag_id: tagId }));
    await sql`INSERT INTO article_tags ${sql(tagValues, 'article_id', 'tag_id')}`;
  }

  return {
    ...inserted,
    tags: data.tags || [],
    created_at: inserted.created_at?.toISOString().split('T')[0],
  };
};

// ─── Update ───────────────────────────────────────────────────────────────────
export const updateArticle = async (articleId, data) => {
  const existingRows = await sql`SELECT * FROM articles WHERE article_id = ${articleId}`;
  if (!existingRows.length) {
    throw new AppError('ARTICLE_NOT_FOUND', 404, 'Article not found');
  }
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

    if (!title_en || title_en.length < 5) errors.title_en = 'English title is required for publishing';
    if (!title_ar || title_ar.length < 5) errors.title_ar = 'Arabic title is required for publishing';
    if (!excerpt_en) errors.excerpt_en = 'English excerpt is required for publishing';
    if (!excerpt_ar) errors.excerpt_ar = 'Arabic excerpt is required for publishing';
    if (!cover) errors.cover_img = 'Cover image is required for publishing';
    if (!content_en) errors.content_en = 'English content is required for publishing';
    if (!content_ar) errors.content_ar = 'Arabic content is required for publishing';

    if (Object.keys(errors).length > 0) {
      throw new AppError('INVALID_STATUS_CHANGE', 400, 'Cannot publish article. Missing required fields.', errors);
    }
  }

  const patch = {};
  if (data.title_en !== undefined) {
    patch.title_en = data.title_en;
    patch.slug = slugify(data.title_en);
  }
  if (data.title_ar !== undefined) patch.title_ar = data.title_ar;

  // Resolve type: prefer UUID directly, else resolve from name string
  if (data.article_type_id !== undefined) {
    patch.article_type_id = data.article_type_id;
  } 
  if (data.excerpt_en  !== undefined) patch.excerpt_en  = data.excerpt_en;
  if (data.excerpt_ar  !== undefined) patch.excerpt_ar  = data.excerpt_ar;
  if (data.cover_img   !== undefined) patch.cover_img   = data.cover_img;
  if (data.content_en  !== undefined) patch.content_en  = sql.json(data.content_en);
  if (data.content_ar  !== undefined) patch.content_ar  = sql.json(data.content_ar);
  if (data.status      !== undefined) {
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
      const tagValues = data.tags.map(tagId => ({ article_id: articleId, tag_id: tagId }));
      await sql`INSERT INTO article_tags ${sql(tagValues, 'article_id', 'tag_id')}`;
    }
  }

  return getArticleById(articleId);
};

// ─── Save Draft ───────────────────────────────────────────────────────────────
export const saveDraft = async (articleId, data) => {
  const existingRows = await sql`SELECT article_id FROM articles WHERE article_id = ${articleId}`;
  if (!existingRows.length) {
    throw new AppError('ARTICLE_NOT_FOUND', 404, 'Article not found');
  }

  const patch = { status: 'DRAFT' };
  if (data.title_en   !== undefined) { patch.title_en = data.title_en; patch.slug = slugify(data.title_en); }
  if (data.title_ar   !== undefined)   patch.title_ar   = data.title_ar;
  if (data.excerpt_en !== undefined)   patch.excerpt_en = data.excerpt_en;
  if (data.excerpt_ar !== undefined)   patch.excerpt_ar = data.excerpt_ar;
  if (data.content_en !== undefined)   patch.content_en = sql.json(data.content_en);
  if (data.content_ar !== undefined)   patch.content_ar = sql.json(data.content_ar);
  if (data.cover_img  !== undefined)   patch.cover_img  = data.cover_img;

  await sql`
    UPDATE articles
    SET ${sql(patch)}, updated_at = NOW()
    WHERE article_id = ${articleId}
  `;

  if (data.tags !== undefined) {
    await sql`DELETE FROM article_tags WHERE article_id = ${articleId}`;
    if (Array.isArray(data.tags) && data.tags.length > 0) {
      const tagValues = data.tags.map(tagId => ({ article_id: articleId, tag_id: tagId }));
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
  if (!existingRows.length) {
    throw new AppError('ARTICLE_NOT_FOUND', 404, 'Article not found');
  }

  await sql`DELETE FROM article_tags WHERE article_id = ${articleId}`;
  await sql`DELETE FROM likes WHERE article_id = ${articleId}`;
  await sql`DELETE FROM saves WHERE article_id = ${articleId}`;
  await sql`DELETE FROM articles WHERE article_id = ${articleId}`;
};

// ─── Related Articles ─────────────────────────────────────────────────────────
export const getRelatedArticles = async (articleId, limit = 3) => {
  const current = await sql`SELECT article_id FROM articles WHERE article_id = ${articleId}`;
  if (!current.length) {
    throw new AppError('ARTICLE_NOT_FOUND', 404, 'Article not found');
  }

  const currentTags = await sql`SELECT tag_id FROM article_tags WHERE article_id = ${articleId}`;
  const tagIds = currentTags.map(t => t.tag_id);

  if (!tagIds.length) {
    const recent = await sql`
      SELECT article_id, title_en, title_ar, slug, excerpt_en, excerpt_ar, cover_img, created_at, content_en
      FROM articles
      WHERE article_id != ${articleId} AND status = 'PUBLISHED'
      ORDER BY created_at DESC
      LIMIT ${Number(limit)}
    `;

    return {
      data: recent.map(a => ({
        article_id: a.article_id,
        title_en: a.title_en,
        title_ar: a.title_ar,
        slug: a.slug,
        excerpt_en: a.excerpt_en,
        excerpt_ar: a.excerpt_ar,
        cover_img: a.cover_img,
        reading_time: Math.max(1, Math.round((JSON.stringify(a.content_en || {}).length) / 1000)),
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

  const data = related.map(a => {
    const daysOld = Math.floor((Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const recencyBonus = daysOld < 30 ? 0.5 : 0;

    return {
      article_id: a.article_id,
      title_en: a.title_en,
      title_ar: a.title_ar,
      slug: a.slug,
      excerpt_en: a.excerpt_en,
      excerpt_ar: a.excerpt_ar,
      cover_img: a.cover_img,
      reading_time: Math.max(1, Math.round((JSON.stringify(a.content_en || {}).length) / 1000)),
      shared_tags: a.shared_tag_names_en ? a.shared_tag_names_en.split(',').slice(0, 2) : [],
      shared_tags_count: Number(a.shared_count),
      relevance_score: Number(a.shared_count) + recencyBonus,
      created_at: a.created_at?.toISOString().split('T')[0],
    };
  });

  return {
    data,
    meta: { is_fallback: false, total_matches: data.length },
  };
};

export const getArticleTypes = async () => {
  const rows = await sql`SELECT article_type_id, name_en, name_ar FROM article_types ORDER BY name_en`;
  return rows.map(r => ({
    id: r.article_type_id,
    article_type_id: r.article_type_id,
    name_en: r.name_en,
    name_ar: r.name_ar,
  }));
};