'use client';

// Handles Supabase OAuth redirects for BOTH:
//   1. PKCE code flow:               /auth/callback?code=...  (was previously in route.ts)
//   2. Implicit hash-fragment flow:  /auth/callback#access_token=...  (Google OAuth)
//
// Next.js does not allow both route.ts AND page.tsx in the same directory,
// so both flows are handled here client-side.

export const dynamic = 'force-dynamic';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { CheckSquare } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setToken, setSession, logout } = useAuthStore();

  useEffect(() => {
    let done = false;

    // ✅ Strip #access_token=... hash from URL bar immediately
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }

    const navigateAfterSession = async (session: any) => {
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
        router.replace('/');
      }
    };

    // ── Path 1: PKCE code flow (?code=...) ──────────────────────────────────
    const code = searchParams?.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ data, error }) => {
          navigateAfterSession(error || !data.session ? null : data.session);
        })
        .catch(() => navigateAfterSession(null));
      return;
    }

    // ── Path 2: Implicit hash flow (#access_token=...) ──────────────────────
    // Supabase JS automatically parses the hash on onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigateAfterSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigateAfterSession(session);
      else setTimeout(() => { if (!done) navigateAfterSession(null); }, 3000);
    });

    return () => { subscription.unsubscribe(); };
  }, [router, searchParams, setUser, setToken, setSession, logout]);

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

// useSearchParams requires Suspense in Next.js
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
        <CheckSquare size={28} style={{ color: 'var(--accent)', opacity: 0.5 }} />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
