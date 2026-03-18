/*
Auth Controller

Controller يستقبل request
ويرسلها إلى service.

Handles HTTP request.
*/

import * as authService from '../services/auth.service.js';

export const register = async (req, res, next) => {
  try {
    // call service logic
    const result = await authService.register(req.body);

    // send response
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/*
الـ controller هو الوسيط بين
route و service

هو يستقبل الطلب ويرسل الرد
*/
export const login = async (req, res, next) => {
  try {
    // إرسال البيانات إلى service
    const result = await authService.login(req, body);
    // إرسال البيانات إلى service
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const result = await authService.refresh(req.body.refreshToken);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const verify = (req, res) => {
  res.status(200).json({
    message: 'Token valid',
    user: req.user,
  });
};
