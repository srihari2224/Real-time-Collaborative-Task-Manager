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

export const updateProfile = async (req: FastifyRequest, reply: FastifyReply) => {
  const body = (req.body ?? {}) as { full_name?: string | null; avatar_url?: string | null };
  const user = await authService.updateProfile(req.user!.id, {
    full_name: body.full_name,
    avatar_url: body.avatar_url,
  });
  return apiResponse.success(reply, user, 'Profile updated');
};
