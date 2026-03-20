// src/services/authService.js

import * as userRepository from '../repositories/userRepository.js';

export const syncUser = async (supabaseUser, extras = {}) => {
  const { id, email, user_metadata } = supabaseUser;
  const full_name = extras.full_name || user_metadata?.full_name || user_metadata?.name;
  const avatar_url = extras.avatar_url || user_metadata?.avatar_url;
  return userRepository.upsertUser({ id, email, full_name, avatar_url });
};

export const getMe = async (userId) => {
  return userRepository.findById(userId);
};
