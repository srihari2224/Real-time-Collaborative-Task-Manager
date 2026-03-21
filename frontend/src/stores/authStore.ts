import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Session } from '@supabase/supabase-js';
import { User } from '@/types';

export interface GoogleUser {
  sub: string;
  name: string | null;
  email: string;
  picture: string | null;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  session: Session | null;
  googleUser: GoogleUser | null;   // populated after Google OAuth login
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setSession: (session: Session | null) => void;
  setGoogleUser: (googleUser: GoogleUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      session: null,
      googleUser: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setSession: (session) => set({ session, token: session?.access_token ?? null }),
      setGoogleUser: (googleUser) => set({ googleUser }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, token: null, session: null, googleUser: null }),
    }),
    {
      name: 'taskflow-auth',
      partialize: (state) => ({ user: state.user, token: state.token, googleUser: state.googleUser }),
    }
  )
);
