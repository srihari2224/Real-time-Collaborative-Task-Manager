'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Zap } from 'lucide-react';
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

/* ── Live Network Animation ─────────────────────────────────────────────── */
function NetworkAnimation() {
  const nodes = [
    { cx: 50, cy: 50 },
    { cx: 200, cy: 80 },
    { cx: 340, cy: 40 },
    { cx: 120, cy: 180 },
    { cx: 270, cy: 160 },
    { cx: 380, cy: 200 },
    { cx: 60, cy: 260 },
    { cx: 310, cy: 280 },
  ];

  const edges = [
    [0, 1], [1, 2], [1, 4], [3, 4], [4, 5],
    [0, 3], [2, 5], [3, 6], [4, 7], [5, 7],
  ];

  return (
    <div className="net-wrap">
      <svg viewBox="0 0 440 320" preserveAspectRatio="xMidYMid meet" className="net-svg">
        <defs>
          <radialGradient id="nodeGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.4" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Animated edges */}
        {edges.map(([a, b], i) => (
          <motion.line
            key={i}
            x1={nodes[a].cx} y1={nodes[a].cy}
            x2={nodes[b].cx} y2={nodes[b].cy}
            stroke="url(#nodeGrad)"
            strokeWidth="1"
            strokeOpacity="0.3"
            animate={{ strokeOpacity: [0.15, 0.5, 0.15] }}
            transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}

        {/* Moving data packets along edges */}
        {edges.slice(0, 5).map(([a, b], i) => (
          <motion.circle
            key={`pkt-${i}`}
            r="3"
            fill="#3b82f6"
            filter="url(#glow)"
            animate={{
              cx: [nodes[a].cx, nodes[b].cx, nodes[a].cx],
              cy: [nodes[a].cy, nodes[b].cy, nodes[a].cy],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + i * 0.7,
              repeat: Infinity,
              delay: i * 0.9,
              ease: 'linear',
            }}
          />
        ))}

        {/* Nodes */}
        {nodes.map((n, i) => (
          <g key={i}>
            {/* Pulse ring */}
            <motion.circle
              cx={n.cx} cy={n.cy} r="12"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1"
              animate={{ r: [8, 20], opacity: [0.5, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.38, ease: 'easeOut' }}
            />
            {/* Core dot */}
            <motion.circle
              cx={n.cx} cy={n.cy} r="5"
              fill="url(#nodeGrad)"
              filter="url(#glow)"
              animate={{ r: [4, 6, 4] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.25 }}
            />
          </g>
        ))}

        {/* Floating status pills */}
        {[
          { x: 140, y: 22, text: 'DONE', color: '#22c55e' },
          { x: 260, y: 195, text: 'IN PROGRESS', color: '#f59e0b' },
          { x: 22, y: 290, text: 'TODO', color: '#525252' },
        ].map(({ x, y, text, color }, i) => (
          <motion.g key={`pill-${i}`}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3 + i * 0.6, repeat: Infinity, delay: i * 1.1 }}
          >
            <rect x={x} y={y} width={text.length * 7 + 14} height={18}
              rx="3" fill={color} fillOpacity="0.12"
              stroke={color} strokeWidth="0.8" strokeOpacity="0.5"
            />
            <text x={x + 7} y={y + 12.5} fontSize="8" fontWeight="700"
              fill={color} fontFamily="'Space Mono', monospace" letterSpacing="0.06em"
            >{text}</text>
          </motion.g>
        ))}
      </svg>

      <style jsx>{`
        .net-wrap {
          margin-top: 48px;
          width: 100%;
          max-width: 440px;
          opacity: 0.88;
        }
        .net-svg {
          width: 100%;
          height: auto;
          overflow: visible;
        }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
function AuthContent() {
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setToken, setSession, setGoogleUser } = useAuthStore();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

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
        if (p?.state?.token) { router.replace('/'); return; }
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
    toast.success('Welcome back.');
    router.replace('/');
  };

  const handleSignup = async (data: SignupForm) => {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email, password: data.password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { toast.error(error.message); return; }
    if (!authData.session) {
      toast.success('Account created. Check your email to confirm.');
      setMode('login'); return;
    }
    await syncSessionToBackend(authData.session.access_token, setUser, setToken, setSession, authData.session);
    toast.success('Welcome to TaskFlow.');
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
      toast.success(`Welcome, ${googleUser.name ?? googleUser.email}.`, { id: 'google-login' });
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

  return (
    <div className="auth-root">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Editorial vertical grid lines */}
      <div className="vertical-line" style={{ left: '25%' }} />
      <div className="vertical-line" style={{ left: '50%' }} />
      <div className="vertical-line" style={{ left: '75%' }} />

      {/* ════════════════ LEFT PANEL ════════════════ */}
      <div className="auth-left">
        <div className="auth-left-inner">

          {/* Brand */}
          <motion.div
            className="brand-logo"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="brand-icon">
              <Zap size={18} strokeWidth={2.5} />
            </div>
            <span>TaskFlow</span>
          </motion.div>

          {/* Hero */}
          <div className="hero-block">
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              Work flows<br />when teams{' '}
              <span className="hero-accent">connect.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              Real-time collaboration, task management, and built-in chat — all in one place.
            </motion.p>
          </div>

          {/* Live Network Animation */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <NetworkAnimation />
          </motion.div>

        </div>
      </div>

      {/* ════════════════ RIGHT PANEL ════════════════ */}
      <div className="auth-right">
        <div className="auth-form-wrap">

          {/* Mobile logo */}
          <div className="mobile-logo">
            <div className="brand-icon sm"><Zap size={14} /></div>
            <span>TaskFlow</span>
          </div>

          {/* Mode tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`auth-tab ${isLogin ? 'active' : ''}`}
            >Sign In</button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
            >Create Account</button>
          </div>

          {/* Google button */}
          <button type="button" className="google-btn" onClick={handleGoogleLogin}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider"><span>or</span></div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {isLogin ? (
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="auth-form">
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="login-email">Email</label>
                    <input
                      id="login-email"
                      className={`auth-input${loginForm.formState.errors.email ? ' error' : ''}`}
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...loginForm.register('email')}
                    />
                    {loginForm.formState.errors.email && (
                      <span className="auth-error">{loginForm.formState.errors.email.message}</span>
                    )}
                  </div>
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="login-password">Password</label>
                    <div className="auth-pw-wrap">
                      <input
                        id="login-password"
                        className={`auth-input${loginForm.formState.errors.password ? ' error' : ''}`}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...loginForm.register('password')}
                      />
                      <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <span className="auth-error">{loginForm.formState.errors.password.message}</span>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="auth-submit"
                    disabled={loginForm.formState.isSubmitting}
                  >
                    {loginForm.formState.isSubmitting ? 'Signing in…' : (
                      <><span>Sign In</span><ArrowRight size={15} /></>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="auth-form">
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="signup-email">Email</label>
                    <input
                      id="signup-email"
                      className={`auth-input${signupForm.formState.errors.email ? ' error' : ''}`}
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...signupForm.register('email')}
                    />
                    {signupForm.formState.errors.email && (
                      <span className="auth-error">{signupForm.formState.errors.email.message}</span>
                    )}
                  </div>
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="signup-password">Password</label>
                    <div className="auth-pw-wrap">
                      <input
                        id="signup-password"
                        className={`auth-input${signupForm.formState.errors.password ? ' error' : ''}`}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...signupForm.register('password')}
                      />
                      <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {signupForm.formState.errors.password && (
                      <span className="auth-error">{signupForm.formState.errors.password.message}</span>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="auth-submit"
                    disabled={signupForm.formState.isSubmitting}
                  >
                    {signupForm.formState.isSubmitting ? 'Creating account…' : (
                      <><span>Create Account</span><ArrowRight size={15} /></>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Switch link */}
          <p className="auth-switch">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => switchMode(isLogin ? 'signup' : 'login')}>
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {/* Footer links */}
          <div className="auth-footer-links">
            <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
            <span className="auth-footer-sep">·</span>
            <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
          </div>


        </div>
      </div>

      <style jsx global>{`
        /* ── Auth Root ── */
        .auth-root {
          display: flex;
          min-height: 100vh;
          background: var(--bg-base);
          color: var(--text-primary);
          position: relative;
          overflow: hidden;
        }
        html.light .auth-root {
          background: #f5f5f5;
        }

        /* ── Left Panel ── */
        .auth-left {
          flex: 1;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 60px 48px;
          border-right: 1px solid var(--border-subtle);
          position: relative;
        }
        @media (max-width: 768px) { .auth-left { display: none; } }

        .auth-left-inner {
          width: 100%;
          max-width: 460px;
          display: flex;
          flex-direction: column;
        }

        /* ── Brand ── */
        .brand-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 48px;
        }
        .brand-logo > span {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: -0.03em;
          font-family: var(--font-display);
          color: var(--text-primary);
        }
        .brand-icon {
          width: 34px; height: 34px;
          background: var(--accent);
          display: flex; align-items: center; justify-content: center;
          color: white;
          box-shadow: 0 0 20px rgba(59,130,246,0.4);
        }
        .brand-icon.sm { width: 26px; height: 26px; }

        /* ── Hero ── */
        .hero-block { margin-bottom: 8px; }
        .hero-block h1 {
          font-size: clamp(28px, 3.5vw, 42px);
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1.12;
          margin-bottom: 14px;
          color: var(--text-primary);
        }
        .hero-accent { color: var(--accent); }
        .hero-block p {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.65;
          max-width: 380px;
        }

        /* ── Right Panel ── */
        .auth-right {
          width: 440px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 36px;
          background: var(--bg-surface);
        }
        @media (max-width: 768px) {
          .auth-right { width: 100%; background: var(--bg-base); padding: 32px 24px; }
          .auth-root { flex-direction: column; }
        }

        .auth-form-wrap {
          width: 100%;
          max-width: 360px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Mobile logo */
        .mobile-logo {
          display: none;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .mobile-logo > span {
          font-size: 15px;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: var(--text-primary);
        }
        @media (max-width: 768px) { .mobile-logo { display: flex; } }

        /* ── Tabs ── */
        .auth-tabs {
          display: flex;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 4px;
        }
        .auth-tab {
          flex: 1;
          padding: 10px;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          font-size: 12px;
          font-weight: 700;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 150ms ease;
          margin-bottom: -1px;
        }
        .auth-tab:hover { color: var(--text-primary); }
        .auth-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

        /* ── Google Button ── */
        .google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 11px 16px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          font-size: 13.5px;
          font-weight: 600;
          font-family: var(--font-display);
          cursor: pointer;
          transition: all 150ms ease;
        }
        .google-btn:hover {
          background: var(--bg-overlay);
          border-color: var(--border-strong);
          box-shadow: var(--shadow-sm);
        }

        /* ── Divider ── */
        .auth-divider {
          text-align: center;
          position: relative;
        }
        .auth-divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0; right: 0;
          height: 1px;
          background: var(--border-subtle);
        }
        .auth-divider span {
          position: relative;
          background: var(--bg-surface);
          padding: 0 12px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        @media (max-width: 768px) {
          .auth-divider span { background: var(--bg-base); }
        }

        /* ── Form ── */
        .auth-form { display: flex; flex-direction: column; gap: 14px; }
        .auth-field { display: flex; flex-direction: column; gap: 6px; }
        .auth-label {
          font-size: 10px;
          font-weight: 700;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
        }
        .auth-input {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          font-family: var(--font-display);
          font-size: 14px;
          padding: 11px 14px;
          width: 100%;
          outline: none;
          transition: border-color 150ms, box-shadow 150ms;
          border-radius: 0;
          -webkit-appearance: none;
        }
        .auth-input::placeholder { color: var(--text-muted); }
        .auth-input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
        .auth-input.error { border-color: #ef4444; }

        /* ── Password wrapper ── */
        .auth-pw-wrap { position: relative; }
        .auth-pw-wrap .auth-input { padding-right: 42px; }
        .auth-eye {
          position: absolute;
          right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center;
          padding: 0;
        }
        .auth-eye:hover { color: var(--text-primary); }

        /* ── Error ── */
        .auth-error { font-size: 11px; color: #ef4444; font-weight: 500; }

        /* ── Submit ── */
        .auth-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 16px;
          background: var(--accent);
          color: white;
          border: none;
          font-size: 13px;
          font-weight: 700;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: all 150ms ease;
          margin-top: 4px;
        }
        .auth-submit:hover:not(:disabled) {
          background: var(--accent-hover);
          box-shadow: 0 0 24px rgba(59,130,246,0.4);
        }
        .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Switch ── */
        .auth-switch {
          text-align: center;
          font-size: 12.5px;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .auth-switch button {
          background: none; border: none;
          color: var(--accent);
          font-weight: 700; cursor: pointer;
          font-size: 12.5px;
          font-family: var(--font-display);
        }
        .auth-switch button:hover { text-decoration: underline; }

        /* ── Footer links ── */
        .auth-footer-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 4px;
          padding-top: 12px;
          border-top: 1px solid var(--border-subtle);
        }
        .auth-footer-links a {
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-muted);
          text-decoration: none;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          transition: color 150ms;
        }
        .auth-footer-links a:hover { color: var(--text-secondary); }
        .auth-footer-sep {
          font-size: 12px;
          color: var(--border-default);
        }

        /* ── Editorial vertical lines ── */
        .vertical-line {
          position: absolute;
          top: 0; bottom: 0;
          width: 1px;
          background: var(--border-subtle);
          pointer-events: none;
          opacity: 0.4;
        }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-base)',
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 200, 400].map((d) => (
            <div key={d} className="skeleton" style={{ width: 8, height: 8, animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}