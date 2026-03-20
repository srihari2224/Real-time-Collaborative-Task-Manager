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
  const { user: supabaseUser, error } = await verifySupabaseToken(token);
  if (error || !supabaseUser) {
    return unauthorized(reply, 'Invalid or expired token') as unknown as void;
  }

  // Upsert user into local DB (picks up full_name / avatar from Supabase user_metadata)
  try {
    const meta = (supabaseUser.user_metadata ?? {}) as Record<string, string>;
    const full_name = meta.full_name ?? meta.name ?? null;
    const avatar_url = meta.avatar_url ?? meta.picture ?? null;
    req.user = await userRepository.upsertUser({
      id: supabaseUser.id,
      email: supabaseUser.email ?? '',
      full_name,
      avatar_url,
    });
  } catch {
    // DB unavailable — build minimal user from token payload
    req.user = {
      id: supabaseUser.id,
      email: supabaseUser.email ?? '',
      full_name: null,
      avatar_url: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }
};

export default requireAuth;
