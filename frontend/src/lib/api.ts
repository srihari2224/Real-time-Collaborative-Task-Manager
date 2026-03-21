import axios from 'axios';
import { supabase } from './supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

import { useAuthStore } from '../stores/authStore';

// Attach either Zustand token (Google/Backend) or Supabase fallback
api.interceptors.request.use(async (config) => {
  // 1. Try token from store first (handles both Google credentials and synced backend tokens)
  const storeToken = useAuthStore.getState().token;
  if (storeToken) {
    config.headers.Authorization = `Bearer ${storeToken}`;
    return config;
  }

  // 2. Fallback: Check Supabase directly (e.g. initial load before store hydrated)
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Handle 401 globally → redirect to auth
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Clear Supabase session
        supabase.auth.signOut();
        // Clear Zustand store to prevent infinite redirect loops built on stale local storage Google tokens
        useAuthStore.getState().logout();
        window.location.href = '/auth';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
