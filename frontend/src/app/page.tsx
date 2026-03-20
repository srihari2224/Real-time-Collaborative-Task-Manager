'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

export default function RootPage() {
  const router = useRouter();
  const { setUser, setToken, setSession, logout } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        logout();
        router.replace('/auth');
        return;
      }

      // Store session in authStore
      setSession(session);
      setToken(session.access_token);

      // Sync to backend & get workspaces
      try {
        const syncRes = await api.post('/api/v1/auth/sync', {});
        setUser(syncRes.data.data);

        const wsRes = await api.get('/api/v1/workspaces');
        const workspaces = wsRes.data?.data ?? wsRes.data ?? [];
        if (workspaces.length > 0) {
          router.replace(`/workspace/${workspaces[0].id}`);
        } else {
          // No workspace yet — go to a create-workspace page or auth
          router.replace('/auth');
        }
      } catch {
        // Backend unreachable but session exists — still try to navigate
        router.replace('/auth');
      }
    });
  }, [router, setUser, setToken, setSession, logout]);

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
