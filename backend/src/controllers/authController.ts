// src/controllers/authController.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import * as authService from '../services/authService.js';
import * as apiResponse from '../utils/apiResponse.js';

export const syncUser = async (req: FastifyRequest, reply: FastifyReply) => {
  const user = await authService.syncUser(req.user!, req.body as Record<string, unknown>);
  return apiResponse.success(reply, user, 'User synced successfully');
};

export const getMe = async (req: FastifyRequest, reply: FastifyReply) => {
  const user = await authService.getMe(req.user!.id);
  return apiResponse.success(reply, user);
};
