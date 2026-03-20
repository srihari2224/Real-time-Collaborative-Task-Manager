'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckSquare, ArrowRight, Briefcase } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function OnboardingPage() {
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser, setToken, setSession } = useAuthStore();

  // Ensure user has a valid session
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/auth');
        return;
      }
      setSession(session);
      setToken(session.access_token);
      // Try to sync to backend silently
      try {
        const res = await api.post('/api/v1/auth/sync', {});
        setUser(res.data?.data ?? res.data);
      } catch {
        // non-blocking
      }
      // If they already have a workspace, skip onboarding
      try {
        const wsRes = await api.get('/api/v1/workspaces');
        const workspaces = wsRes.data?.data ?? wsRes.data ?? [];
        if (workspaces.length > 0) {
          router.replace(`/workspace/${workspaces[0].id}`);
        }
      } catch {
        // stay on onboarding
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/api/v1/workspaces', { name: workspaceName.trim() });
      const workspace = res.data?.data ?? res.data;
      toast.success('Workspace created! Welcome to TaskFlow 🎉');
      router.replace(`/workspace/${workspace.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create workspace. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg-base)', padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          width: '100%', maxWidth: 420,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 16, padding: 40,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <CheckSquare size={26} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>TaskFlow</span>
        </div>

        {/* Welcome text */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Create your first workspace
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            A workspace is your team&apos;s home. Give it a name to get started.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Workspace name
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Briefcase size={14} style={{ position: 'absolute', left: 11, color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                className="input"
                style={{ paddingLeft: 34, width: '100%' }}
                type="text"
                placeholder="e.g. Acme Corp, My Team"
                value={workspaceName}
                onChange={e => setWorkspaceName(e.target.value)}
                autoFocus
                maxLength={80}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px 14px', marginTop: 4 }}
            disabled={loading || !workspaceName.trim()}
          >
            {loading
              ? 'Creating...'
              : <><span>Create Workspace</span><ArrowRight size={14} /></>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
