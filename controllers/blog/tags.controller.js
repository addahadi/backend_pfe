import * as tagService from '../../services/blog/tags.service.js';

const sendData = (res, statusCode, data) => res.status(statusCode).json({ data });

export const getTags = async (req, res, next) => {
  try {
    const result = await tagService.getTags();
    sendData(res, 200, result);
  } catch (err) {
    next(err);
  }
};

export const createTag = async (req, res, next) => {
  try {
    const { name_en, name_ar } = req.body;
    const result = await tagService.createTag(name_en, name_ar);
    sendData(res, 201, result);
  } catch (err) {
    next(err);
  }
};

export const deleteTag = async (req, res, next) => {
  try {
    await tagService.deleteTag(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};