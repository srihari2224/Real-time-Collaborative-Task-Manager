'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare, Eye, EyeOff, ArrowRight, Mail, Lock,
  Sun, Moon, Layers, MessageSquare, Users, BarChart2
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import { signInWithGoogle } from '@/lib/googleAuth';

/* ── Validation ─────────────────────────────────────────────────────────── */
const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
const signupSchema = loginSchema;
type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;
type Mode = 'login' | 'signup';

/* ── Backend sync ───────────────────────────────────────────────────────── */
async function syncSessionToBackend(
  accessToken: string,
  setUser: (u: any) => void,
  setToken: (t: string) => void,
  setSession: (s: any) => void,
  session: any,
) {
  setToken(accessToken);
  setSession(session);
  try {
    const res = await api.post('/api/v1/auth/sync', {});
    setUser(res.data?.data ?? res.data);
  } catch { /* Backend sync failed — session still valid */ }
}

/* ── Feature list ───────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: Layers, label: 'Kanban, List & Calendar views' },
  { icon: MessageSquare, label: 'Built-in Task Chat Messenger' },
  { icon: Users, label: 'Real-time WebSocket collaboration' },
  { icon: BarChart2, label: 'Role-based permissions & invites' },
];

/* ── Preview cards ──────────────────────────────────────────────────────── */
const PREVIEW_CARDS = [
  { title: 'Homepage Redesign', priority: 'urgent', assignees: ['S', 'T'], msgs: 3 },
  { title: 'API Integration', priority: 'high', assignees: ['P'], msgs: 1 },
  { title: 'Design System', priority: 'medium', assignees: ['J', 'L'], msgs: 0 },
];

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Main Component                                                            */
/* ══════════════════════════════════════════════════════════════════════════ */
function AuthContent() {
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setToken, setSession, setGoogleUser } = useAuthStore();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  /* Apply theme to <html> */
  useEffect(() => {
    const saved = localStorage.getItem('tf-theme') as 'light' | 'dark' | null;
    if (saved) { setTheme(saved); document.documentElement.classList.toggle('dark', saved === 'dark'); }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('tf-theme', next);
  };

  /* OAuth error toast */
  useEffect(() => {
    if (searchParams.get('error') === 'oauth_error')
      toast.error('Google sign-in failed. Please try again.');
  }, [searchParams]);

  /* Redirect if already logged in */
  useEffect(() => {
    const stored = localStorage.getItem('taskflow-auth');
    if (stored) {
      try {
        const p = JSON.parse(stored);
        if (p?.state?.googleUser && p?.state?.token) { router.replace('/'); return; }
      } catch { /* ignore */ }
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/');
    });
  }, [router]);

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const handleLogin = async (data: LoginForm) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email, password: data.password,
    });
    if (error) { toast.error(error.message); return; }
    await syncSessionToBackend(authData.session!.access_token, setUser, setToken, setSession, authData.session);
    toast.success('Welcome back!');
    router.replace('/');
  };

  const handleSignup = async (data: SignupForm) => {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email, password: data.password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { toast.error(error.message); return; }
    if (!authData.session) {
      toast.success('Account created! Check your email to confirm.');
      setMode('login'); return;
    }
    await syncSessionToBackend(authData.session.access_token, setUser, setToken, setSession, authData.session);
    toast.success('Welcome to TaskFlow!');
    router.replace('/');
  };

  const handleGoogleLogin = async () => {
    try {
      toast.loading('Opening Google Sign-In...', { id: 'google-login' });
      const { credential, user: googleUser } = await signInWithGoogle();
      const res = await api.post('/api/v1/auth/google', { credential });
      const backendUser = res.data?.data ?? res.data;
      setToken(credential);
      setGoogleUser(googleUser);
      setUser(backendUser);
      toast.success(`Welcome, ${googleUser.name ?? googleUser.email}!`, { id: 'google-login' });
      router.replace('/');
    } catch (err: any) {
      toast.dismiss('google-login');
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Google Sign-In failed');
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m); setShowPassword(false);
    loginForm.reset(); signupForm.reset();
  };

  const isLogin = mode === 'login';

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="auth-root">

      {/* ── Theme toggle ─────────────────────────────────────────────── */}
      <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
        <AnimatePresence mode="wait">
          <motion.span key={theme} initial={{ rotate: -30, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 30, opacity: 0 }} transition={{ duration: 0.2 }}>
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </motion.span>
        </AnimatePresence>
      </button>

      {/* ════════════════ LEFT PANEL ════════════════ */}
      <div className="auth-left">
        <div className="auth-left-inner">

          {/* Logo */}
          <div className="brand-logo">
            <div className="brand-icon"><CheckSquare size={20} /></div>
            <span>TaskFlow</span>
          </div>

          {/* Hero */}
          <div className="hero-block">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Work flows better<br />when teams{' '}
              <span className="hero-accent">connect.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Real-time collaboration, task management, and built-in chat — all in one place.
            </motion.p>
          </div>

          {/* Feature list */}
          <motion.ul
            className="feature-list"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } } }}
          >
            {FEATURES.map(({ icon: Icon, label }) => (
              <motion.li
                key={label}
                className="feature-item"
                variants={{ hidden: { opacity: 0, x: -14 }, visible: { opacity: 1, x: 0 } }}
              >
                <span className="feature-dot"><Icon size={13} /></span>
                <span>{label}</span>
              </motion.li>
            ))}
          </motion.ul>

          {/* Preview cards */}
          <div className="preview-stack">
            {PREVIEW_CARDS.map((card, i) => (
              <motion.div
                key={card.title}
                className={`preview-card priority-card-${card.priority}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.12 }}
              >
                <div className={`pcard-stripe stripe-${card.priority}`} />
                <div className="pcard-body">
                  <span className="pcard-title">{card.title}</span>
                  <div className="pcard-meta">
                    <div className="mini-stack">
                      {card.assignees.map((a, j) => (
                        <div key={j} className={`mini-avatar ma-${j}`}>{a}</div>
                      ))}
                    </div>
                    {card.msgs > 0 && (
                      <span className="pcard-badge">{card.msgs} msg</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>

      {/* ════════════════ RIGHT PANEL ════════════════ */}
      <div className="auth-right">
        <div className="auth-form-wrap">

          {/* Mobile logo */}
          <div className="mobile-logo">
            <div className="brand-icon sm"><CheckSquare size={16} /></div>
            <span>TaskFlow</span>
          </div>

          {/* Mode tabs */}
          <div className="mode-tabs">
            <button className={`mode-tab ${isLogin ? 'active' : ''}`} onClick={() => switchMode('login')}>Sign In</button>
            <button className={`mode-tab ${!isLogin ? 'active' : ''}`} onClick={() => switchMode('signup')}>Sign Up</button>
            <div className="mode-tab-indicator" style={{ transform: `translateX(${isLogin ? '0%' : '100%'})` }} />
          </div>

          {/* Header */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode + '-hdr'}
              className="form-header"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.16 }}
            >
              <h2>{isLogin ? 'Welcome back' : 'Create account'}</h2>
              <p>{isLogin ? 'Sign in to continue to your workspace.' : 'Join TaskFlow and start collaborating.'}</p>
            </motion.div>
          </AnimatePresence>

          {/* Google first */}
          <GoogleBtn onClick={handleGoogleLogin} />

          {/* Divider */}
          <div className="divider-row"><span>or with email</span></div>

          {/* Form */}
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.18 }}
                onSubmit={loginForm.handleSubmit(handleLogin)}
                className="auth-form"
                noValidate
              >
                <FieldEmail reg={loginForm.register('email')} error={loginForm.formState.errors.email?.message} />
                <FieldPassword
                  reg={loginForm.register('password')}
                  error={loginForm.formState.errors.password?.message}
                  show={showPassword}
                  toggle={() => setShowPassword(v => !v)}
                  placeholder="Enter your password"
                />
                <SubmitBtn loading={loginForm.formState.isSubmitting} label="Sign In" loadingLabel="Signing in..." />
              </motion.form>
            ) : (
              <motion.form
                key="signup-form"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.18 }}
                onSubmit={signupForm.handleSubmit(handleSignup)}
                className="auth-form"
                noValidate
              >
                <FieldEmail reg={signupForm.register('email')} error={signupForm.formState.errors.email?.message} />
                <FieldPassword
                  reg={signupForm.register('password')}
                  error={signupForm.formState.errors.password?.message}
                  show={showPassword}
                  toggle={() => setShowPassword(v => !v)}
                  placeholder="Min. 6 characters"
                />
                <SubmitBtn loading={signupForm.formState.isSubmitting} label="Create Account" loadingLabel="Creating account..." />
              </motion.form>
            )}
          </AnimatePresence>

          {/* Switch mode link */}
          <p className="switch-cta">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button type="button" className="switch-link" onClick={() => switchMode(isLogin ? 'signup' : 'login')}>
              {isLogin ? 'Sign up free' : 'Sign in'}
            </button>
          </p>

          {/* Footer */}
          <p className="auth-tos">
            By continuing you agree to our{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          </p>

        </div>
      </div>

      <style jsx global>{STYLES}</style>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */
function FieldEmail({ reg, error }: { reg: any; error?: string }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor="email-input">Email address</label>
      <div className="input-wrap">
        <Mail size={15} className="field-icon" />
        <input
          id="email-input"
          className={`field-input ${error ? 'has-error' : ''}`}
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          inputMode="email"
          {...reg}
        />
      </div>
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
}

function FieldPassword({
  reg, error, show, toggle, placeholder,
}: { reg: any; error?: string; show: boolean; toggle: () => void; placeholder: string }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor="pass-input">Password</label>
      <div className="input-wrap">
        <Lock size={15} className="field-icon" />
        <input
          id="pass-input"
          className={`field-input has-right-icon ${error ? 'has-error' : ''}`}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete="current-password"
          {...reg}
        />
        <button type="button" className="field-icon-right" onClick={toggle} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
}

function SubmitBtn({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button type="submit" className="submit-btn" disabled={loading}>
      {loading
        ? <><span className="btn-spinner" />{loadingLabel}</>
        : <>{label}<ArrowRight size={15} /></>
      }
    </button>
  );
}

function GoogleBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="google-btn" onClick={onClick}>
      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      <span>Continue with Google</span>
    </button>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */
const STYLES = `
  /* ── Imports ── */
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  /* ── Root & Theme ── */
  .auth-root {
    --font: 'Plus Jakarta Sans', 'Inter', sans-serif;

    /* Light */
    --bg-base:        #f0f4f8;
    --bg-surface:     #ffffff;
    --bg-elevated:    #f7f9fc;
    --bg-overlay:     #eef2f7;
    --bg-hover:       rgba(37,99,235,0.05);

    --text-primary:   #0f172a;
    --text-secondary: #475569;
    --text-muted:     #94a3b8;

    --border-subtle:  rgba(15,23,42,0.07);
    --border-default: rgba(15,23,42,0.12);
    --border-strong:  rgba(15,23,42,0.22);

    --accent:         #2563eb;
    --accent-soft:    rgba(37,99,235,0.10);
    --accent-hover:   #1d4ed8;
    --accent-light:   #dbeafe;

    --error:          #dc2626;
    --error-soft:     rgba(220,38,38,0.10);

    --radius:         10px;
    --radius-sm:      6px;
    --radius-lg:      14px;
    --shadow-sm:      0 1px 3px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.06);
    --shadow-md:      0 4px 16px rgba(15,23,42,0.10);
    --shadow-glow:    0 0 0 3px rgba(37,99,235,0.18);
    --transition:     150ms cubic-bezier(0.4,0,0.2,1);

    font-family: var(--font);
    display: flex;
    height: 100vh;
    min-height: 600px;
    width: 100vw;
    background: var(--bg-base);
    overflow: hidden;
    position: relative;
  }

  /* ── Dark mode ── */
  html.dark .auth-root {
    --bg-base:        #0b1120;
    --bg-surface:     #111827;
    --bg-elevated:    #1c2333;
    --bg-overlay:     #243049;
    --bg-hover:       rgba(255,255,255,0.04);

    --text-primary:   #f1f5f9;
    --text-secondary: #94a3b8;
    --text-muted:     #64748b;

    --border-subtle:  rgba(255,255,255,0.06);
    --border-default: rgba(255,255,255,0.10);
    --border-strong:  rgba(255,255,255,0.18);

    --accent:         #3b82f6;
    --accent-soft:    rgba(59,130,246,0.12);
    --accent-hover:   #2563eb;
    --accent-light:   rgba(59,130,246,0.08);

    --shadow-sm:      0 1px 3px rgba(0,0,0,0.50);
    --shadow-md:      0 4px 20px rgba(0,0,0,0.45);
    --shadow-glow:    0 0 0 3px rgba(59,130,246,0.25);
  }

  /* ── Theme toggle ── */
  .theme-toggle {
    position: fixed;
    top: 16px;
    right: 20px;
    z-index: 200;
    width: 38px;
    height: 38px;
    border-radius: var(--radius);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-sm);
    transition: all var(--transition);
    font-family: var(--font);
  }
  .theme-toggle:hover {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
    transform: scale(1.06);
  }

  /* ════════ LEFT PANEL ════════ */
  .auth-left {
    flex: 1;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 52px;
    overflow: hidden;
    position: relative;
  }

  .auth-left::before {
    content: '';
    position: absolute;
    top: -180px;
    right: -180px;
    width: 520px;
    height: 520px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%);
    pointer-events: none;
  }
  .auth-left::after {
    content: '';
    position: absolute;
    bottom: -120px;
    left: -100px;
    width: 380px;
    height: 380px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(37,99,235,0.04) 0%, transparent 70%);
    pointer-events: none;
  }

  .auth-left-inner {
    max-width: 440px;
    width: 100%;
    position: relative;
    z-index: 1;
  }

  /* Brand logo */
  .brand-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    margin-bottom: 52px;
    font-family: var(--font);
  }
  .brand-icon {
    width: 38px;
    height: 38px;
    border-radius: var(--radius);
    background: var(--accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(37,99,235,0.35);
    flex-shrink: 0;
  }
  .brand-icon.sm {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm);
  }

  /* Hero */
  .hero-block { margin-bottom: 32px; }

  .hero-block h1 {
    font-size: clamp(1.7rem, 2.8vw, 2.4rem);
    font-weight: 800;
    line-height: 1.18;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    margin-bottom: 12px;
    font-family: var(--font);
  }
  .hero-accent { color: var(--accent); }

  .hero-block p {
    font-size: 14.5px;
    color: var(--text-secondary);
    line-height: 1.65;
    font-weight: 400;
  }

  /* Feature list */
  .feature-list {
    list-style: none;
    margin: 0 0 36px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .feature-item {
    display: flex;
    align-items: center;
    gap: 11px;
    font-size: 13.5px;
    color: var(--text-secondary);
    font-weight: 500;
  }
  .feature-dot {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm);
    background: var(--accent-soft);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  /* Preview stack */
  .preview-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .preview-card {
    display: flex;
    align-items: stretch;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    overflow: hidden;
    transition: box-shadow var(--transition), border-color var(--transition);
  }
  .preview-card:hover {
    border-color: var(--border-default);
    box-shadow: var(--shadow-sm);
  }
  .pcard-stripe {
    width: 4px;
    flex-shrink: 0;
  }
  .stripe-urgent { background: #dc2626; }
  .stripe-high   { background: #ea580c; }
  .stripe-medium { background: var(--accent); }

  .pcard-body {
    flex: 1;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .pcard-title {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .pcard-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .mini-stack { display: flex; }
  .mini-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    font-size: 9px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: -6px;
    border: 2px solid var(--bg-elevated);
    color: white;
  }
  .mini-avatar:first-child { margin-left: 0; }
  .ma-0 { background: #2563eb; }
  .ma-1 { background: #7c3aed; }
  .ma-2 { background: #16a34a; }

  .pcard-badge {
    font-size: 10px;
    font-weight: 700;
    color: var(--accent);
    background: var(--accent-soft);
    border-radius: 99px;
    padding: 2px 8px;
  }

  /* ════════ RIGHT PANEL ════════ */
  .auth-right {
    width: 480px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 44px;
    background: var(--bg-base);
    overflow-y: auto;
  }

  .auth-form-wrap {
    width: 100%;
    max-width: 370px;
  }

  .mobile-logo {
    display: none;
    align-items: center;
    gap: 9px;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    margin-bottom: 28px;
    font-family: var(--font);
  }

  /* Mode tabs */
  .mode-tabs {
    display: flex;
    position: relative;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 4px;
    margin-bottom: 28px;
    gap: 0;
  }
  .mode-tab {
    flex: 1;
    padding: 9px 0;
    font-size: 13.5px;
    font-weight: 600;
    font-family: var(--font);
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: calc(var(--radius) - 2px);
    position: relative;
    z-index: 1;
    transition: color var(--transition);
  }
  .mode-tab.active { color: var(--text-primary); }
  .mode-tab-indicator {
    position: absolute;
    top: 4px;
    left: 4px;
    width: calc(50% - 4px);
    height: calc(100% - 8px);
    background: var(--bg-surface);
    border-radius: calc(var(--radius) - 4px);
    border: 1px solid var(--border-default);
    box-shadow: var(--shadow-sm);
    transition: transform 220ms cubic-bezier(0.4,0,0.2,1);
  }

  /* Form header */
  .form-header {
    margin-bottom: 24px;
  }
  .form-header h2 {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: var(--text-primary);
    margin-bottom: 5px;
    font-family: var(--font);
  }
  .form-header p {
    font-size: 13.5px;
    color: var(--text-muted);
    line-height: 1.5;
  }

  /* Google button */
  .google-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 12px 16px;
    background: var(--bg-surface);
    border: 1.5px solid var(--border-default);
    border-radius: var(--radius);
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
    font-family: var(--font);
    cursor: pointer;
    transition: all var(--transition);
    letter-spacing: -0.01em;
  }
  .google-btn:hover {
    background: var(--bg-elevated);
    border-color: var(--border-strong);
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }
  .google-btn:active { transform: translateY(0); box-shadow: none; }

  /* Divider */
  .divider-row {
    position: relative;
    text-align: center;
    margin: 20px 0;
  }
  .divider-row::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--border-subtle);
  }
  .divider-row span {
    position: relative;
    background: var(--bg-base);
    padding: 0 14px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  /* Form */
  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
    margin-bottom: 20px;
  }

  /* Field */
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    font-family: var(--font);
  }
  .input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .field-icon {
    position: absolute;
    left: 13px;
    color: var(--text-muted);
    pointer-events: none;
    flex-shrink: 0;
  }
  .field-input {
    width: 100%;
    background: var(--bg-surface);
    border: 1.5px solid var(--border-default);
    border-radius: var(--radius);
    color: var(--text-primary);
    font-family: var(--font);
    font-size: 14px;
    font-weight: 500;
    padding: 12px 14px 12px 40px;
    outline: none;
    transition: border-color var(--transition), box-shadow var(--transition), background var(--transition);
    -webkit-appearance: none;
  }
  .field-input::placeholder { color: var(--text-muted); font-weight: 400; }
  .field-input:focus {
    border-color: var(--accent);
    box-shadow: var(--shadow-glow);
    background: var(--bg-surface);
  }
  .field-input:hover:not(:focus) { border-color: var(--border-strong); }
  .field-input.has-right-icon { padding-right: 44px; }
  .field-input.has-error {
    border-color: var(--error);
    box-shadow: 0 0 0 3px var(--error-soft);
  }
  .field-icon-right {
    position: absolute;
    right: 13px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 4px;
    border-radius: 4px;
    transition: color var(--transition);
    font-family: var(--font);
  }
  .field-icon-right:hover { color: var(--text-primary); }
  .field-error {
    font-size: 12px;
    font-weight: 600;
    color: var(--error);
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .field-error::before { content: '⚠'; font-size: 11px; }

  /* Submit button */
  .submit-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 13px 16px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius);
    font-size: 14.5px;
    font-weight: 700;
    font-family: var(--font);
    cursor: pointer;
    letter-spacing: -0.01em;
    transition: all var(--transition);
    margin-top: 4px;
  }
  .submit-btn:hover:not(:disabled) {
    background: var(--accent-hover);
    box-shadow: 0 4px 16px rgba(37,99,235,0.35), var(--shadow-glow);
    transform: translateY(-1px);
  }
  .submit-btn:active:not(:disabled) { transform: translateY(0); box-shadow: none; }
  .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

  /* Spinner */
  .btn-spinner {
    width: 15px;
    height: 15px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Switch cta */
  .switch-cta {
    text-align: center;
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 24px;
  }
  .switch-link {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 13px;
    font-weight: 700;
    font-family: var(--font);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
    transition: opacity var(--transition);
  }
  .switch-link:hover { opacity: 0.75; }

  /* ToS footer */
  .auth-tos {
    text-align: center;
    font-size: 11.5px;
    color: var(--text-muted);
    line-height: 1.6;
  }
  .auth-tos a {
    color: var(--text-secondary);
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: color var(--transition);
  }
  .auth-tos a:hover { color: var(--text-primary); }

  /* ════════ TABLET ════════ */
  @media (max-width: 900px) {
    .auth-left { padding: 36px 32px; }
    .auth-right { width: 420px; padding: 36px 32px; }
  }

  /* ════════ MOBILE ════════ */
  @media (max-width: 720px) {
    .auth-root { flex-direction: column; height: auto; min-height: 100vh; overflow-y: auto; }
    .auth-left { display: none; }
    .auth-right {
      width: 100%;
      min-height: 100vh;
      padding: 28px 20px 40px;
      align-items: flex-start;
      justify-content: center;
    }
    .auth-form-wrap { max-width: 100%; }
    .mobile-logo { display: flex; }
    .form-header h2 { font-size: 20px; }
    .field-input { font-size: 16px; } /* Prevent iOS zoom */
    .theme-toggle { top: 12px; right: 14px; }
  }

  @media (max-width: 400px) {
    .auth-right { padding: 24px 16px 36px; }
    .google-btn { font-size: 13.5px; }
  }
`;

/* ── Page wrapper ─────────────────────────────────────────────────────────── */
export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#f0f4f8',
      }}>
        <CheckSquare size={28} style={{ color: '#2563eb', opacity: 0.5 }} />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}