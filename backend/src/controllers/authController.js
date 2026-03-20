// src/controllers/authController.js

import * as authService from '../services/authService.js';
import * as apiResponse from '../utils/apiResponse.js';

export const syncUser = async (req, reply) => {
  const user = await authService.syncUser(req.user, req.body);
  return apiResponse.success(reply, user, 'User synced successfully');
};

export const getMe = async (req, reply) => {
  const user = await authService.getMe(req.user.id);
  return apiResponse.success(reply, user);
};
