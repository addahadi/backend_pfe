import { ok, handleError } from '../utils/http.js';
import * as svc from '../services/admin.service.js';
import { adminUsersQuerySchema } from '../schemas/admin.schema.js';

export async function getDashboard(req, res) {
  try {
    ok(res, await svc.getDashboardStats());
  } catch (e) {
    handleError(res, e);
  }
}

export async function getSubscribers(req, res) {
  try {
    const { status, search, page, limit } = req.query;
    ok(
      res,
      await svc.getSubscribersAdmin({
        status: status || 'ALL',
        search: search || '',
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
      })
    );
  } catch (e) {
    handleError(res, e);
  }
}

export async function getUsers(req, res) {
  try {
    const filters = adminUsersQuerySchema.parse(req.query);
    ok(res, await svc.getUsersAdmin(filters));
  } catch (e) {
    handleError(res, e);
  }
}

export async function getUserDetails(req, res) {
  try {
    ok(res, await svc.getUserAdminById(req.params.userId));
  } catch (e) {
    handleError(res, e);
  }
}

export async function updateUserStatus(req, res) {
  try {
    ok(
      res,
      await svc.updateAdminUserStatus({
        userId: req.params.userId,
        status: req.body.status,
      })
    );
  } catch (e) {
    handleError(res, e);
  }
}
