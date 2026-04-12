import * as authService from '../services/auth.service.js';
import { ok, handleError } from '../utils/http.js';

export const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    ok(res, result, 201);
  } catch (err) { handleError(res, err); }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    ok(res, result);
  } catch (err) { handleError(res, err); }
};

export const refresh = async (req, res) => {
  try {
    const result = await authService.refresh(req.body.refreshToken);
    ok(res, result);
  } catch (err) { handleError(res, err); }
};

export const verify = (req, res) => {
  ok(res, { message: 'Token valid', user: req.user });
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.logout(refreshToken);
    ok(res, result);
  } catch (err) { handleError(res, err); }
};
