// src/services/authService.ts
import type { User } from '../types/index.js';
import * as userRepository from '../repositories/userRepository.js';

interface SupabaseUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, string>;
}

export const syncUser = async (supabaseUser: SupabaseUserLike, extras: Partial<User> = {}): Promise<User> => {
  const { id, email, user_metadata } = supabaseUser;
  const full_name = extras.full_name ?? user_metadata?.full_name ?? user_metadata?.name ?? null;
  const avatar_url = extras.avatar_url ?? user_metadata?.avatar_url ?? null;
  return userRepository.upsertUser({ id, email: email ?? '', full_name, avatar_url });
};

export const getMe = async (userId: string): Promise<User | null> =>
  userRepository.findById(userId);

export const updateProfile = async (
  userId: string,
  data: { full_name?: string | null; avatar_url?: string | null }
): Promise<User> =>
  userRepository.updateUser(userId, {
    full_name: data.full_name,
    avatar_url: data.avatar_url,
  });
