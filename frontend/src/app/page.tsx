'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

export default function RootPage() {
  const router = useRouter();
  const { setUser, setToken, setSession, logout } = useAuthStore();
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const handleNavigation = async () => {
      // ── Step 1: Resolve token safely, bypassing Zustand hydration delay ──
      // Always read localStorage first. Zustand may not have hydrated yet
      // on the very first render, so memory state is unreliable here.
      let safeToken = token;

      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('taskflow-auth');
          if (stored) {
            const parsed = JSON.parse(stored);
            // Prefer localStorage values — they are always current
            safeToken = parsed?.state?.token ?? safeToken;
          }
        } catch { /* ignore malformed JSON */ }
      }

      // ── Step 2: Token path (Google ID token OR Supabase access token) ───
      if (safeToken) {
        try {
          const wsRes = await api.get('/api/v1/workspaces');
          const workspaces = wsRes.data?.data ?? wsRes.data ?? [];
          router.replace(workspaces.length > 0 ? '/my-tasks' : '/onboarding');
        } catch {
          router.replace('/onboarding');
        }
        return;
      }

      // ── Step 3: Supabase session path ────────────────────────────────────
      // CRITICAL: Only call logout() here if we're ALSO sure localStorage
      // has no token. Never logout based on Zustand memory alone.
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Double-check localStorage one more time before logging out.
        // This guards against the case where getSession() resolves before
        // Zustand has written its persisted state back to memory.
        if (!safeToken) {
          logout();
          router.replace('/auth');
        }
        // If safeToken exists but session doesn't, token-based auth was
        // already handled above.
        return;
      }

      setSession(session);
      setToken(session.access_token);

      try {
        const syncRes = await api.post('/api/v1/auth/sync', {});
        setUser(syncRes.data?.data ?? syncRes.data);
      } catch {
        console.warn('Backend sync failed — continuing with session only');
      }

      try {
        const wsRes = await api.get('/api/v1/workspaces');
        const workspaces = wsRes.data?.data ?? wsRes.data ?? [];
        router.replace(workspaces.length > 0 ? '/my-tasks' : '/onboarding');
      } catch {
        router.replace('/onboarding');
      }
    };

    handleNavigation();
  }, [router, setUser, setToken, setSession, logout, token]);

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
