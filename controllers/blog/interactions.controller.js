import * as interactionService from '../../services/blog/blog.intractions.service.js';

const sendData = (res, statusCode, data) => res.status(statusCode).json({ data });

export const toggleLike = async (req, res, next) => {
  try {
    // users table PK is `id`, but authenticate middleware sets req.user.userId
    const userId = req.user.userId;
    const result = await interactionService.toggleLike(userId, req.params.id);
    sendData(res, 200, result);
  } catch (err) {
    next(err);
  }
};

export const toggleSave = async (req, res, next) => {
  try {
    // FIX: was using req.user.id — must match authenticate middleware which sets req.user.userId
    const userId = req.user.userId;
    const result = await interactionService.toggleSave(userId, req.params.id);
    sendData(res, 200, result);
  } catch (err) {
    next(err);
  }
};