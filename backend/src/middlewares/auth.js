// src/middlewares/auth.js
// Fastify preHandler — verifies Supabase JWT and attaches user to request

import { verifySupabaseToken } from '../config/supabase.js';
import { unauthorized } from '../utils/apiResponse.js';
import * as userRepository from '../repositories/userRepository.js';

/**
 * Require a valid Supabase Bearer token.
 * Sets req.user = { id, email, full_name, avatar_url }
 */
export const requireAuth = async (req, reply) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(reply, 'Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);
  const { user, error } = await verifySupabaseToken(token);

  if (error || !user) {
    return unauthorized(reply, 'Invalid or expired token');
  }

  // Attach full DB user profile to request
  try {
    const dbUser = await userRepository.findById(user.id);
    req.user = dbUser || { id: user.id, email: user.email };
  } catch {
    req.user = { id: user.id, email: user.email };
  }
};

export default requireAuth;
