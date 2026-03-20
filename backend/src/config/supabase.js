// src/config/supabase.js
// Supabase client — used for Auth verification and admin operations

import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Public client (anon key) — for client-facing auth
export const supabase = createClient(
  env.supabase.url,
  env.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Admin client (service role key) — bypasses RLS, for server-side admin ops
export const supabaseAdmin = createClient(
  env.supabase.url,
  env.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Verify a Supabase JWT and return the authenticated user
 * @param {string} token - Bearer token from Authorization header
 * @returns {Promise<{user: Object}|{error: Object}>}
 */
export const verifySupabaseToken = async (token) => {
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return { error };
    return { user: data.user };
  } catch (err) {
    logger.error({ err }, 'Supabase token verification failed');
    return { error: err };
  }
};

/**
 * Invite a user by email (Supabase Auth admin)
 * @param {string} email
 * @returns {Promise<Object>}
 */
export const inviteUser = async (email) => {
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
  if (error) throw error;
  return data;
};

/**
 * Delete a user from Supabase Auth
 * @param {string} userId
 */
export const deleteAuthUser = async (userId) => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw error;
};

export default { supabase, supabaseAdmin, verifySupabaseToken, inviteUser, deleteAuthUser };
