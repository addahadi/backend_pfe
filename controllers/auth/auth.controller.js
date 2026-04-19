/*
Auth Controller

Controller يستقبل request
ويرسلها إلى service.

Handles HTTP request.
*/
//controller

import * as authService from '../../services/auth/auth.service.js';
import { ok, handleError } from '../../utils/http.js';

export const register = async (req, res) => {
  try {
    // call service logic
    const result = await authService.register(req.body);

    // send response
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
    // ✅ نخرج البيانات من req.body
    const { email, password } = req.body;

    // إرسال البيانات إلى service
    const result = await authService.login({ email, password });
    // إرسال البيانات إلى service
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
    message: 'Token valid',
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

    ok(res, result);
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
    ok(res, result);
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
    ok(res, result);
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
    ok(res, result);
  } catch (error) {
    handleError(res, error);
  }
};
