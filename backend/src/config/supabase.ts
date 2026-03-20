// src/config/supabase.ts
import { createClient, type SupabaseClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const supabase: SupabaseClient = createClient(env.supabase.url, env.supabase.anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const supabaseAdmin: SupabaseClient = createClient(
  env.supabase.url,
  env.supabase.serviceRoleKey || env.supabase.anonKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const verifySupabaseToken = async (
  token: string
): Promise<{ user: SupabaseUser | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return { user: null, error: error as unknown as Error };
    return { user: data.user, error: null };
  } catch (err) {
    logger.error({ err }, 'Supabase token verification failed');
    return { user: null, error: err as Error };
  }
};

export const inviteUser = async (email: string): Promise<SupabaseUser> => {
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
  if (error) throw error;
  return data.user;
};

export const deleteAuthUser = async (userId: string): Promise<void> => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw error;
};

export default { supabase, supabaseAdmin, verifySupabaseToken, inviteUser, deleteAuthUser };
