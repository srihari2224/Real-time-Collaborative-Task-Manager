// src/middlewares/auth.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifySupabaseToken } from '../config/supabase.js';
import { verifyGoogleToken } from '../services/googleAuthService.js';
import { unauthorized } from '../utils/apiResponse.js';
import * as userRepository from '../repositories/userRepository.js';

/**
 * Checks if a JWT token looks like a Google ID token by inspecting its header.
 * Google ID tokens have alg=RS256 and kid set, while Supabase uses HS256.
 */
function looksLikeGoogleToken(token: string): boolean {
  try {
    const [headerB64] = token.split('.');
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    return header.alg === 'RS256' && typeof header.kid === 'string';
  } catch {
    return false;
  }
}

export const requireAuth = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized(reply, 'Missing or invalid Authorization header') as unknown as void;
  }
  const token = authHeader.slice(7);

  // ── Try Google ID token first (RS256 + kid in header) ──────────────────────
  if (looksLikeGoogleToken(token)) {
    try {
      const googleUser = await verifyGoogleToken(token);
      req.user = await userRepository.upsertUser({
        id: `google_${googleUser.sub}`,
        email: googleUser.email,
        full_name: googleUser.name,
        avatar_url: googleUser.picture,
      });
      return;
    } catch {
      // Not a valid Google token — fall through to Supabase check
    }
  }

  // ── Try Supabase token (email/password auth) ────────────────────────────────
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
