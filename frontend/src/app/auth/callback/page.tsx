'use client';

// Handles Supabase OAuth redirects for BOTH:
//   1. PKCE code flow:               /auth/callback?code=...
//   2. Implicit hash-fragment flow:  /auth/callback#access_token=...  (Google OAuth)

export const dynamic = 'force-dynamic';

import { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { CheckSquare } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setToken, setSession, logout } = useAuthStore();
  // Use a ref so the "done" guard persists across re-renders without re-triggering the effect
  const done = useRef(false);

  useEffect(() => {
    // ✅ Strip #access_token=... hash from URL bar immediately so tokens aren't visible
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }

    const finish = async (session: any) => {
      // Guard: only execute once no matter how many times Supabase fires events
      if (done.current) return;
      done.current = true;

      if (!session) {
        logout();
        router.replace('/auth?error=oauth_error');
        return;
      }

      setSession(session);
      setToken(session.access_token);

      // Step 1: Sync to backend (non-blocking — session is valid even if this fails)
      try {
        const syncRes = await api.post('/api/v1/auth/sync', {});
        setUser(syncRes.data?.data ?? syncRes.data);
      } catch {
        console.warn('Backend sync failed — continuing with Supabase session only');
      }

      // Step 2: Fetch workspaces and navigate — NEVER send back to /auth
      try {
        const wsRes = await api.get('/api/v1/workspaces');
        const workspaces = wsRes.data?.data ?? wsRes.data ?? [];
        router.replace(workspaces.length > 0 ? '/my-tasks' : '/onboarding');
      } catch {
        // Backend unreachable — go to onboarding, not /auth
        router.replace('/onboarding');
      }
    };

    // ── Path 1: PKCE code flow (?code=...) ──────────────────────────────────
    const code = searchParams?.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ data, error }) => finish(error || !data.session ? null : data.session))
        .catch(() => finish(null));
      return;
    }

    // ── Path 2: Implicit hash flow (#access_token=...) ──────────────────────
    // Listen for auth state change — Supabase parses the hash automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(session);
    });

    // Also check immediately — in case auth event fired before we subscribed
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish(session);
      else {
        // If no session found after 4 seconds, something went wrong
        setTimeout(() => { if (!done.current) finish(null); }, 4000);
      }
    });

    return () => { subscription.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← intentionally empty: we only run this once on mount

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

// useSearchParams must be wrapped in Suspense in Next.js 13+
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
