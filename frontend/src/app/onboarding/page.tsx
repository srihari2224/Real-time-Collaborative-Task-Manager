'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, ArrowRight, Briefcase, Sun, Moon, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const STEPS = ['Name your workspace', 'You\'re all set'];

export default function OnboardingPage() {
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const router = useRouter();
  const { setUser, setToken, setSession, logout } = useAuthStore();

  /* ── Theme ── */
  useEffect(() => {
    const saved = localStorage.getItem('tf-theme') as 'light' | 'dark' | null;
    if (saved) { setTheme(saved); document.documentElement.classList.toggle('dark', saved === 'dark'); }
  }, []);

  const toggleTheme = () => {
    const next: 'light' | 'dark' = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('tf-theme', next);
  };

  /* ── Session guard ── */
  useEffect(() => {
    const bootstrap = async () => {
      let safeToken = useAuthStore.getState().token;
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('taskflow-auth');
          if (stored) {
            const parsed = JSON.parse(stored);
            safeToken = parsed?.state?.token ?? safeToken;
          }
        } catch { /* ignore malformed JSON */ }
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session && !safeToken) {
        logout();
        router.replace('/auth');
        return;
      }

      if (session) {
        setSession(session);
        setToken(session.access_token);
        try {
          const res = await api.post('/api/v1/auth/sync', {});
          setUser(res.data?.data ?? res.data);
        } catch { /* silent */ }
      }

      try {
        const wsRes = await api.get('/api/v1/workspaces');
        const workspaces = wsRes.data?.data ?? wsRes.data ?? [];
        if (workspaces.length > 0) router.replace(`/workspace/${workspaces[0].id}`);
      } catch { /* stay */ }
    };

    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/api/v1/workspaces', { name: workspaceName.trim() });
      const workspace = res.data?.data ?? res.data;
      toast.success('Workspace created! Welcome to TaskFlow');
      router.replace(`/workspace/${workspace.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create workspace');
      setLoading(false);
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="ob-root">

        {/* ── Theme toggle ── */}
        <button className="ob-theme-btn" onClick={toggleTheme} title="Toggle theme" type="button">
          <AnimatePresence mode="wait">
            <motion.span key={theme}
              initial={{ rotate: -30, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 30, opacity: 0 }} transition={{ duration: 0.18 }}
              style={{ display: 'flex' }}>
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </motion.span>
          </AnimatePresence>
        </button>

        {/* ── Left decorative panel ── */}
        <div className="ob-left">
          <div className="ob-left-inner">
            <div className="ob-brand">
              <div className="ob-brand-icon"><CheckSquare size={22} /></div>
              <span>TaskFlow</span>
            </div>
            <h2 className="ob-left-heading">
              Your team's new<br />home starts here.
            </h2>
            <p className="ob-left-sub">
              A workspace brings your projects, tasks, and conversations into one focused place.
            </p>
            <div className="ob-feature-list">
              {[
                'Create unlimited projects',
                'Invite your whole team',
                'Real-time collaboration',
                'Built-in task chat',
              ].map((f) => (
                <div key={f} className="ob-feature-item">
                  <span className="ob-feature-check">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {f}
                </div>
              ))}
            </div>

            {/* Decorative card preview */}
            <div className="ob-preview-card">
              <div className="ob-preview-dot green" />
              <div className="ob-preview-lines">
                <div className="ob-preview-line w70" />
                <div className="ob-preview-line w45" />
              </div>
              <div className="ob-preview-avatars">
                {['A', 'B', 'C'].map((l, i) => (
                  <div key={l} className={`ob-preview-av av-${i}`}>{l}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="ob-right">
          <motion.div
            className="ob-card"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Mobile brand */}
            <div className="ob-mobile-brand">
              <div className="ob-brand-icon sm"><CheckSquare size={16} /></div>
              <span>TaskFlow</span>
            </div>

            {/* Step indicator */}
            <div className="ob-steps">
              {STEPS.map((s, i) => (
                <div key={s} className={`ob-step ${i === 0 ? 'active' : ''}`}>
                  <span className="ob-step-num">{i + 1}</span>
                  <span className="ob-step-label">{s}</span>
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="ob-card-header">
              <div className="ob-header-icon">
                <Sparkles size={20} />
              </div>
              <h1>Create your workspace</h1>
              <p>Give your workspace a name — this is where you and your team will collaborate.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="ob-form" noValidate>
              <div className="ob-field">
                <label className="ob-label" htmlFor="ws-name">Workspace name</label>
                <div className="ob-input-wrap">
                  <Briefcase size={15} className="ob-input-icon" />
                  <input
                    id="ws-name"
                    className="ob-input"
                    type="text"
                    placeholder="e.g. Acme Corp, My Team..."
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    autoFocus
                    maxLength={80}
                    autoComplete="off"
                  />
                </div>
                <span className="ob-char-count">{workspaceName.length}/80</span>
              </div>

              <button
                type="submit"
                className="ob-submit-btn"
                disabled={loading || !workspaceName.trim()}
              >
                {loading ? (
                  <><span className="ob-spinner" />Creating workspace…</>
                ) : (
                  <><span>Create Workspace</span><ArrowRight size={15} /></>
                )}
              </button>
            </form>

            <p className="ob-hint">
              You can always rename your workspace later in settings.
            </p>
          </motion.div>
        </div>

      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.ob-root {
  --font:       'Plus Jakarta Sans', 'Inter', sans-serif;
  --bg:         #f0f4f8;
  --surface:    #ffffff;
  --elevated:   #f7f9fc;
  --overlay:    #eef2f7;
  --txt:        #0f172a;
  --txt2:       #475569;
  --muted:      #94a3b8;
  --border:     rgba(15,23,42,0.08);
  --border2:    rgba(15,23,42,0.14);
  --accent:     #2563eb;
  --acc-soft:   rgba(37,99,235,0.10);
  --acc-hover:  #1d4ed8;
  --radius:     12px;
  --radius-sm:  7px;
  --shadow:     0 1px 4px rgba(15,23,42,0.10);
  --shadow-md:  0 8px 32px rgba(15,23,42,0.12);
  --glow:       0 0 0 3px rgba(37,99,235,0.18);
  --t:          150ms cubic-bezier(.4,0,.2,1);

  display: flex;
  min-height: 100vh;
  width: 100vw;
  background: var(--bg);
  font-family: var(--font);
  color: var(--txt);
  position: relative;
  overflow: hidden;
}

html.dark .ob-root {
  --bg:       #0b1120;
  --surface:  #111827;
  --elevated: #1c2333;
  --overlay:  #243049;
  --txt:      #f1f5f9;
  --txt2:     #94a3b8;
  --muted:    #64748b;
  --border:   rgba(255,255,255,0.06);
  --border2:  rgba(255,255,255,0.12);
  --accent:   #3b82f6;
  --acc-soft: rgba(59,130,246,0.12);
  --shadow:   0 1px 4px rgba(0,0,0,0.40);
  --shadow-md:0 8px 32px rgba(0,0,0,0.40);
  --glow:     0 0 0 3px rgba(59,130,246,0.25);
}

/* Theme btn */
.ob-theme-btn {
  position: fixed; top: 16px; right: 20px; z-index: 200;
  width: 38px; height: 38px;
  border-radius: var(--radius-sm);
  background: var(--surface);
  border: 1px solid var(--border2);
  color: var(--txt2); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: var(--shadow);
  transition: all var(--t); font-family: var(--font);
}
.ob-theme-btn:hover {
  background: var(--acc-soft);
  border-color: var(--accent);
  color: var(--accent);
  transform: scale(1.06);
}

/* ── Left panel ── */
.ob-left {
  flex: 1;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  padding: 60px 52px;
  position: relative; overflow: hidden;
}
.ob-left::before {
  content: '';
  position: absolute; top: -160px; right: -160px;
  width: 480px; height: 480px; border-radius: 50%;
  background: radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%);
  pointer-events: none;
}
.ob-left::after {
  content: '';
  position: absolute; bottom: -100px; left: -80px;
  width: 320px; height: 320px; border-radius: 50%;
  background: radial-gradient(circle, rgba(37,99,235,0.04) 0%, transparent 70%);
  pointer-events: none;
}
.ob-left-inner { max-width: 420px; width: 100%; position: relative; z-index: 1; }

.ob-brand {
  display: flex; align-items: center; gap: 10px;
  font-size: 18px; font-weight: 800; letter-spacing: -0.03em;
  color: var(--txt); margin-bottom: 44px;
}
.ob-brand-icon {
  width: 40px; height: 40px; border-radius: var(--radius-sm);
  background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(37,99,235,0.35); flex-shrink: 0;
}
.ob-brand-icon.sm { width: 30px; height: 30px; }

.ob-left-heading {
  font-size: clamp(1.7rem, 2.6vw, 2.3rem);
  font-weight: 800; line-height: 1.18;
  letter-spacing: -0.03em; color: var(--txt);
  margin-bottom: 14px;
}
.ob-left-sub {
  font-size: 14.5px; color: var(--txt2);
  line-height: 1.65; margin-bottom: 32px;
}

.ob-feature-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 36px; }
.ob-feature-item {
  display: flex; align-items: center; gap: 10px;
  font-size: 13.5px; color: var(--txt2); font-weight: 500;
}
.ob-feature-check {
  width: 22px; height: 22px; border-radius: 6px;
  background: var(--acc-soft); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

/* Preview card */
.ob-preview-card {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  background: var(--elevated);
  border: 1px solid var(--border2);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.ob-preview-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}
.ob-preview-dot.green { background: #16a34a; }
.ob-preview-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.ob-preview-line {
  height: 8px; border-radius: 99px;
  background: var(--border2);
}
.w70 { width: 70%; }
.w45 { width: 45%; }
.ob-preview-avatars { display: flex; }
.ob-preview-av {
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 700; color: white;
  border: 2px solid var(--elevated);
  margin-left: -6px;
}
.ob-preview-av:first-child { margin-left: 0; }
.av-0 { background: #2563eb; }
.av-1 { background: #7c3aed; }
.av-2 { background: #16a34a; }

/* ── Right panel ── */
.ob-right {
  width: 500px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  padding: 48px 44px;
  background: var(--bg);
  overflow-y: auto;
}

.ob-card {
  width: 100%; max-width: 390px;
  background: var(--surface);
  border: 1px solid var(--border2);
  border-radius: 16px;
  padding: 36px 32px;
  box-shadow: var(--shadow-md);
}

/* Mobile brand */
.ob-mobile-brand {
  display: none;
  align-items: center; gap: 9px;
  font-size: 16px; font-weight: 800;
  letter-spacing: -0.03em; color: var(--txt);
  margin-bottom: 24px;
}

/* Steps */
.ob-steps {
  display: flex; gap: 0;
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}
.ob-step {
  display: flex; align-items: center; gap: 8px;
  flex: 1; opacity: 0.35;
  transition: opacity var(--t);
}
.ob-step.active { opacity: 1; }
.ob-step-num {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--border2); color: var(--muted);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
}
.ob-step.active .ob-step-num {
  background: var(--accent); color: white;
}
.ob-step-label {
  font-size: 12px; font-weight: 600; color: var(--txt2);
}

/* Card header */
.ob-card-header { margin-bottom: 28px; }
.ob-header-icon {
  width: 44px; height: 44px;
  border-radius: var(--radius-sm);
  background: var(--acc-soft); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
}
.ob-card-header h1 {
  font-size: 20px; font-weight: 800;
  letter-spacing: -0.025em; color: var(--txt);
  margin-bottom: 7px;
}
.ob-card-header p {
  font-size: 13.5px; color: var(--muted); line-height: 1.55;
}

/* Form */
.ob-form { display: flex; flex-direction: column; gap: 20px; }

.ob-field { display: flex; flex-direction: column; gap: 6px; }
.ob-label {
  font-size: 11.5px; font-weight: 700;
  color: var(--txt2); text-transform: uppercase;
  letter-spacing: 0.07em;
}
.ob-input-wrap { position: relative; display: flex; align-items: center; }
.ob-input-icon {
  position: absolute; left: 13px;
  color: var(--muted); pointer-events: none;
}
.ob-input {
  width: 100%;
  background: var(--elevated);
  border: 1.5px solid var(--border2);
  border-radius: var(--radius-sm);
  color: var(--txt);
  font-family: var(--font);
  font-size: 14.5px; font-weight: 500;
  padding: 13px 14px 13px 40px;
  outline: none;
  transition: border-color var(--t), box-shadow var(--t), background var(--t);
  -webkit-appearance: none;
}
.ob-input::placeholder { color: var(--muted); font-weight: 400; }
.ob-input:focus {
  border-color: var(--accent);
  box-shadow: var(--glow);
  background: var(--surface);
}
.ob-input:hover:not(:focus) { border-color: var(--border2); }
.ob-char-count {
  font-size: 11px; color: var(--muted);
  font-weight: 500; text-align: right;
  align-self: flex-end;
}

.ob-submit-btn {
  width: 100%;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 14px 16px;
  background: var(--accent); color: white;
  border: none; border-radius: var(--radius-sm);
  font-size: 14.5px; font-weight: 700;
  font-family: var(--font); cursor: pointer;
  letter-spacing: -0.01em;
  transition: all var(--t);
}
.ob-submit-btn:hover:not(:disabled) {
  background: var(--acc-hover);
  box-shadow: 0 4px 16px rgba(37,99,235,0.35), var(--glow);
  transform: translateY(-1px);
}
.ob-submit-btn:active:not(:disabled) { transform: none; box-shadow: none; }
.ob-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ob-spinner {
  width: 15px; height: 15px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white; border-radius: 50%;
  animation: ob-spin 0.65s linear infinite; flex-shrink: 0;
}
@keyframes ob-spin { to { transform: rotate(360deg); } }

.ob-hint {
  font-size: 12px; color: var(--muted);
  text-align: center; margin-top: 16px; line-height: 1.5;
}

/* ── Responsive ── */
@media (max-width: 860px) {
  .ob-left { display: none; }
  .ob-right { width: 100%; padding: 32px 24px; }
  .ob-card { max-width: 100%; padding: 28px 24px; }
  .ob-mobile-brand { display: flex; }
}
@media (max-width: 480px) {
  .ob-right { padding: 24px 16px; }
  .ob-card { padding: 24px 18px; border-radius: 12px; }
  .ob-input { font-size: 16px; }
}
`;