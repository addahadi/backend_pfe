/*
Auth Controller

Controller يستقبل request
ويرسلها إلى service.

Handles HTTP request.
*/
//controller
import { tr } from 'zod/locales';
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
    // ✅ نخرج البيانات من req.body
    const { email, password } = req.body;

    // إرسال البيانات إلى service
    const result = await authService.login({ email, password });
    // إرسال البيانات إلى service
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    console.log(req.body);
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
//logout
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const result = await authService.logout(refreshToken);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
