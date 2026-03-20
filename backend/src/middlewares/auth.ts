// src/middlewares/auth.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifySupabaseToken } from '../config/supabase.js';
import { unauthorized } from '../utils/apiResponse.js';
import * as userRepository from '../repositories/userRepository.js';

export const requireAuth = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized(reply, 'Missing or invalid Authorization header') as unknown as void;
  }
  const token = authHeader.slice(7);
  const { user, error } = await verifySupabaseToken(token);
  if (error || !user) {
    return unauthorized(reply, 'Invalid or expired token') as unknown as void;
  }
  try {
    const dbUser = await userRepository.findById(user.id);
    req.user = dbUser ?? { id: user.id, email: user.email ?? '', full_name: null, avatar_url: null, created_at: new Date(), updated_at: new Date() };
  } catch {
    req.user = { id: user.id, email: user.email ?? '', full_name: null, avatar_url: null, created_at: new Date(), updated_at: new Date() };
  }
};

export default requireAuth;
