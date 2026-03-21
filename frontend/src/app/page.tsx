'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

export default function RootPage() {
  const router = useRouter();
  const { setUser, setToken, setSession, logout } = useAuthStore();

  // Auth state from store (populated either by Google Login or previous session)
  const token = useAuthStore((state) => state.token);
  const googleUser = useAuthStore((state) => state.googleUser);

  useEffect(() => {
    const handleNavigation = async () => {
      // 1. If we ALREADY have a valid token (e.g. from Google login just now), skip Supabase session check
      if (token && googleUser) {
        // Just fetch workspaces and route
        try {
          const wsRes = await api.get('/api/v1/workspaces');
          const workspaces = wsRes.data?.data ?? wsRes.data ?? [];
          if (workspaces.length > 0) {
            router.replace(`/workspace/${workspaces[0].id}`);
          } else {
            router.replace('/onboarding');
          }
        } catch {
          router.replace('/onboarding');
        }
        return;
      }

      // 2. Otherwise, check for a Supabase session
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session) {
          logout();
          router.replace('/auth');
          return;
        }

        // Store session in authStore
        setSession(session);
        setToken(session.access_token);

        // Sync to backend (backend failure is non-blocking)
        try {
          const syncRes = await api.post('/api/v1/auth/sync', {});
          setUser(syncRes.data?.data ?? syncRes.data);
        } catch {
          console.warn('Backend sync failed — continuing with session only');
        }

        try {
          const wsRes = await api.get('/api/v1/workspaces');
          const workspaces = wsRes.data?.data ?? wsRes.data ?? [];
          if (workspaces.length > 0) {
            router.replace(`/workspace/${workspaces[0].id}`);
          } else {
            // No workspace yet — go to onboarding
            router.replace('/onboarding');
          }
        } catch {
          // Backend unreachable but session exists → onboarding, never /auth
          router.replace('/onboarding');
        }
      });
    };

    handleNavigation();
  }, [router, setUser, setToken, setSession, logout, token, googleUser]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%', animationDelay: '0ms' }} />
        <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%', animationDelay: '200ms' }} />
        <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%', animationDelay: '400ms' }} />
      </div>
    </div>
  );
}
