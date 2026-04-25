import * as articleService from '../../services/blog/articles.service.js'; 
import cloudinary from '../../config/cloudinary.js';
import fs from 'fs/promises'; 

const sendData = (res, statusCode, data) => res.status(statusCode).json({ data });

export const getArticles = async (req, res, next) => {
  try {
    const { page, limit, search, type, tag, status } = req.query;

    const result = await articleService.getArticles({
      page,
      limit,
      search,
      type,
      tag,
      status,
    });

    sendData(res, 200, result);
  } catch (err) {
    next(err);
  }
};
export const getArticleTypes = async (req, res, next) => {
  try {
    const types = await articleService.getArticleTypes();
    res.json({ data: types });
  } catch (err) {
    next(err);
  }
};

export const getArticle = async (req, res, next) => {
  try {
    const article = await articleService.getArticleById(req.params.id);
    if (!article) {
      return res.status(404).json({
        error: { code: 'ARTICLE_NOT_FOUND', message: 'Article not found' },
      });
    }
    sendData(res, 200, article);
  } catch (err) {
    next(err);
  }
};

export const getArticleBySlug = async (req, res, next) => {
  try {
    const article = await articleService.getArticleBySlug(req.params.slug);
    if (!article) {
      return res.status(404).json({
        error: { code: 'ARTICLE_NOT_FOUND', message: 'Article not found' },
      });
    }
    sendData(res, 200, article);
  } catch (err) {
    next(err);
  }
};

export const createArticle = async (req, res, next) => {
  try {
    // articles table has no author_id column — pass only req.body
    const result = await articleService.createArticle(req.body);
    sendData(res, 201, result);
  } catch (err) {
    next(err);
  }
};

export const updateArticle = async (req, res, next) => {
  try {
    const result = await articleService.updateArticle(req.params.id, req.body);
    sendData(res, 200, result);
  } catch (err) {
    next(err);
  }
};

export const saveDraft = async (req, res, next) => {
  try {
    const result = await articleService.saveDraft(req.params.id, req.body);
    sendData(res, 200, result);
  } catch (err) {
    next(err);
  }
};

export const deleteArticle = async (req, res, next) => {
  try {
    await articleService.deleteArticle(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const getRelatedArticles = async (req, res, next) => {
  try {
    const result = await articleService.getRelatedArticles(req.params.id, req.query.limit);
    sendData(res, 200, result);
  } catch (err) {
    next(err);
  }
};


// controllers/blog/articles.controller.js
export const uploadCover = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { code: 'INVALID_FILE_TYPE', message: 'No file uploaded' },
      });
    }

 const result = await cloudinary.uploader.upload(req.file.path);
await fs.unlink(req.file.path); // حذف الملف بعد الرفع

    res.status(201).json({
      data: {
        url: result.secure_url,
        filename: result.public_id,
        size: req.file.size,
      },
    });
  } catch (err) {
    console.error("❌ Cloudinary error:", err);
    next(err);
  }
};