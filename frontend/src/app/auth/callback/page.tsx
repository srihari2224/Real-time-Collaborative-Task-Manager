'use client';

// This page handles Supabase OAuth redirects for BOTH:
//   1. Hash-fragment implicit flow:  /auth/callback#access_token=...
//   2. PKCE code flow:               /auth/callback?code=...  (handled by route.ts)
//
// Supabase JS automatically reads the #access_token from the URL hash
// when you call getSession() or onAuthStateChange, so we just need to
// wait for that, store the session, and navigate.

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { CheckSquare } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { setUser, setToken, setSession, logout } = useAuthStore();

  useEffect(() => {
    let done = false;

    // ✅ Clean the ugly #access_token=... from the URL immediately
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const handleSession = async (session: any) => {
      if (done) return;
      done = true;

      if (!session) {
        logout();
        router.replace('/auth?error=oauth_error');
        return;
      }

      setSession(session);
      setToken(session.access_token);

      try {
        const syncRes = await api.post('/api/v1/auth/sync', {});
        setUser(syncRes.data?.data ?? syncRes.data);

        const wsRes = await api.get('/api/v1/workspaces');
        const workspaces = wsRes.data?.data ?? wsRes.data ?? [];
        router.replace(workspaces.length > 0 ? `/workspace/${workspaces[0].id}` : '/auth');
      } catch {
        // Backend unreachable — still navigate home so user isn't stuck
        router.replace('/');
      }
    };

    // Supabase JS v2 automatically parses #access_token from the hash.
    // onAuthStateChange fires immediately if a session is already detected.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) handleSession(session);
    });

    // Also check immediately in case the event already fired
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleSession(session);
    });

    return () => { subscription.unsubscribe(); };
  }, [router, setUser, setToken, setSession, logout]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', background: 'var(--bg-base)', gap: 16,
    }}>
      <CheckSquare size={32} style={{ color: 'var(--accent)', opacity: 0.7 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%', animationDelay: '0ms' }} />
        <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%', animationDelay: '200ms' }} />
        <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%', animationDelay: '400ms' }} />
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Completing sign-in…</p>
    </div>
  );
}
