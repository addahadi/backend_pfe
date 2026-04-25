/*
Auth Controller

Controller يستقبل request
ويرسلها إلى service.

Handles HTTP request.
*/
//controller

import * as authService from '../../services/auth/auth.service.js';
import { ok, handleError } from '../../utils/http.js';

/**
 * Resolve a bilingual message object (or plain string) to a single string
 * based on the language stored in res.locals.lang.
 *
 * Service functions return:
 *   { message_en: '...', message_ar: '...' }
 * This helper picks the right one so the JSON sent to the client always has
 * a plain `message` string.
 *
 * @param {import('express').Response} res
 * @param {{ message_en: string, message_ar: string } | string} data
 * @returns {string}
 */
function resolveMessage(res, data) {
  if (typeof data === 'string') return data;
  const lang = res.locals?.lang || 'en';
  return lang === 'ar' ? (data.message_ar || data.message_en) : data.message_en;
}

export const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    ok(res, result, 201);
  } catch (error) {
    handleError(res, error);
  }
};

/*
الـ controller هو الوسيط بين
route و service

هو يستقبل الطلب ويرسل الرد
*/
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    ok(res, result);
  } catch (error) {
    handleError(res, error);
  }
};

export const refresh = async (req, res) => {
  try {
    console.log(req.body);
    const result = await authService.refresh(req.body.refreshToken);
    ok(res, result);
  } catch (error) {
    handleError(res, error);
  }
};

export const verify = (req, res) => {
  ok(res, {
    message: res.locals.lang === 'ar' ? 'الرمز صالح' : 'Token valid',
    user: req.user,
  });
};

export const getMe = async (req, res) => {
  try {
    const rows = await authService.getMe(req.user.userId);
    ok(res, rows);
  } catch (error) {
    handleError(res, error);
  }
};

//logout
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.logout(refreshToken);
    // result is { message_en, message_ar } — pick the right one
    ok(res, { message: resolveMessage(res, result) });
  } catch (error) {
    handleError(res, error);
  }
};

   /*__________________("-")___________________*/ 
/*
يستقبل الإيميل ويرسل رابط إعادة التعيين
*/
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword({ email });
    ok(res, { message: resolveMessage(res, result) });
  } catch (error) {
    handleError(res, error);
  }
};

/*
يتحقق من صلاحية التوكن
*/
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;
    const result = await authService.verifyResetToken({ token });
    ok(res, { message: resolveMessage(res, result) });
  } catch (error) {
    handleError(res, error);
  }
};

/*
يستقبل التوكن وكلمة السر الجديدة ويحدثها
*/
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword({ token, newPassword });
    ok(res, { message: resolveMessage(res, result) });
  } catch (error) {
    handleError(res, error);
  }
};
