'use client';

// Prevent static prerendering — Supabase accesses localStorage during SSR
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Eye, EyeOff, ArrowRight, Mail, Lock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import { signInWithGoogle } from '@/lib/googleAuth';


const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema;

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;
type Mode = 'login' | 'signup';

// Sync Supabase session to our backend
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
  } catch {
    // Backend sync failed but session is valid — still allow access
  }
}

function AuthContent() {
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setToken, setSession, setGoogleUser } = useAuthStore();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  // Show OAuth error if redirected back with ?error=
  useEffect(() => {
    if (searchParams.get('error') === 'oauth_error') {
      toast.error('Google sign-in failed. Please try again.');
    }
  }, [searchParams]);

  // If already logged in (Supabase session OR persisted Google user), redirect away
  useEffect(() => {
    // Check Google user first (persisted in localStorage via zustand)
    const stored = localStorage.getItem('taskflow-auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.googleUser && parsed?.state?.token) {
          router.replace('/');
          return;
        }
      } catch { /* ignore */ }
    }
    // Check Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/');
      }
    });
  }, [router]);

  const handleLogin = async (data: LoginForm) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await syncSessionToBackend(
      authData.session!.access_token,
      setUser, setToken, setSession,
      authData.session,
    );
    toast.success('Welcome back!');
    router.replace('/');
  };

  const handleSignup = async (data: SignupForm) => {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!authData.session) {
      toast.success('Account created! Check your email to confirm your account.');
      setMode('login');
      return;
    }
    await syncSessionToBackend(
      authData.session.access_token,
      setUser, setToken, setSession,
      authData.session,
    );
    toast.success('Welcome to TaskFlow!');
    router.replace('/');
  };

  const handleGoogleLogin = async () => {
    try {
      toast.loading('Opening Google Sign-In...', { id: 'google-login' });
      // Step 1: Open the Google Identity Services popup
      const { credential, user: googleUser } = await signInWithGoogle();

      // Step 2: Send the Google ID token to our backend for verification & user upsert
      const res = await api.post('/api/v1/auth/google', { credential });
      const backendUser = res.data?.data ?? res.data;

      // Step 3: Store everything in the auth store
      setToken(credential);              // Google ID token used as Bearer token for API calls
      setGoogleUser(googleUser);         // Store Google profile (name, email, picture)
      setUser(backendUser);              // Store the backend user record

      toast.success(`Welcome, ${googleUser.name ?? googleUser.email}!`, { id: 'google-login' });
      router.replace('/');
    } catch (err: any) {
      toast.dismiss('google-login');
      const msg = err?.response?.data?.message ?? err?.message ?? 'Google Sign-In failed';
      toast.error(msg);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setShowPassword(false);
    loginForm.reset();
    signupForm.reset();
  };

  const isLogin = mode === 'login';

  return (
    <div className="auth-page">
      {/* Left Panel — Branding */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-logo">
            <CheckSquare size={32} style={{ color: 'var(--accent)' }} />
            <span>TaskFlow</span>
          </div>
          <div className="auth-hero-text">
            <h1>Work flows better<br />when teams <span className="accent-text">connect.</span></h1>
            <p>Real-time collaboration, task management, and built-in chat — all in one place.</p>
          </div>
          <div className="auth-feature-list">
            {[
              'Kanban, List & Calendar views',
              'Task Chat Messenger built-in',
              'Real-time collaboration with WebSocket',
              'Role-based permissions & invites',
            ].map((f) => (
              <div key={f} className="auth-feature-item">
                <div className="auth-feature-dot" />
                <span>{f}</span>
              </div>
            ))}
          </div>
          <div className="auth-preview">
            {[
              { title: 'Homepage Redesign', priority: 'urgent', assignees: ['S', 'T'], badge: '3' },
              { title: 'API Integration', priority: 'high', assignees: ['P'], badge: '1' },
              { title: 'Design System', priority: 'medium', assignees: ['J', 'L'], badge: '' },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                className="auth-preview-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.15 }}
                style={{ transform: `translateY(${i * 8}px)` }}
              >
                <div className={`auth-preview-priority priority-${card.priority}`} />
                <div className="auth-preview-title">{card.title}</div>
                <div className="auth-preview-meta">
                  <div className="avatar-stack">
                    {card.assignees.map((a, j) => (
                      <div key={j} className="avatar" style={{ width: 20, height: 20, fontSize: 9, background: ['#ff6b47', '#6366f1', '#22c55e'][j % 3] + '30', color: ['#ff6b47', '#6366f1', '#22c55e'][j % 3] }}>
                        {a}
                      </div>
                    ))}
                  </div>
                  {card.badge && (
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent)', background: 'var(--accent-soft)', borderRadius: 99, padding: '1px 6px', fontWeight: 700 }}>
                      {card.badge} msg
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="auth-right">
        <div className="auth-form-container">
          {/* Mobile Logo */}
          <div className="auth-logo-mobile">
            <CheckSquare size={22} style={{ color: 'var(--accent)' }} />
            <span>TaskFlow</span>
          </div>

          {/* Header */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode + '-header'}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="auth-header-text"
            >
              <h2>{isLogin ? 'Sign in to TaskFlow' : 'Create your account'}</h2>
              <p>{isLogin ? 'Welcome back! Enter your credentials to continue.' : 'Use your Google account email and password.'}</p>
            </motion.div>
          </AnimatePresence>

          {/* Form */}
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                onSubmit={loginForm.handleSubmit(handleLogin)}
                className="auth-form"
              >
                <div className="form-field">
                  <label className="form-label">Email address</label>
                  <div className="input-icon-wrap">
                    <Mail size={14} className="input-icon" />
                    <input
                      className="input input-with-icon"
                      type="email"
                      placeholder="you@gmail.com"
                      autoComplete="email"
                      {...loginForm.register('email')}
                    />
                  </div>
                  {loginForm.formState.errors.email && <span className="form-error">{loginForm.formState.errors.email.message}</span>}
                </div>

                <div className="form-field">
                  <label className="form-label">Password</label>
                  <div className="input-icon-wrap">
                    <Lock size={14} className="input-icon" />
                    <input
                      className="input input-with-icon"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...loginForm.register('password')}
                      style={{ paddingRight: 40 }}
                    />
                    <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && <span className="form-error">{loginForm.formState.errors.password.message}</span>}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary auth-submit-btn"
                  disabled={loginForm.formState.isSubmitting}
                >
                  {loginForm.formState.isSubmitting
                    ? <><span className="spinner" />Signing in...</>
                    : <><span>Sign In</span><ArrowRight size={14} /></>}
                </button>

                {/* Toggle to sign up */}
                <p className="auth-switch-text">
                  Don&apos;t have an account?{' '}
                  <button type="button" className="auth-switch-link" onClick={() => switchMode('signup')}>
                    Sign up
                  </button>
                </p>

                {/* Divider */}
                <div className="auth-divider"><span>or continue with</span></div>

                {/* Google */}
                <GoogleBtn onClick={handleGoogleLogin} />
                <p className="auth-google-note">This uses Google OAuth 2.0 authentication.</p>
              </motion.form>
            ) : (
              <motion.form
                key="signup"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                onSubmit={signupForm.handleSubmit(handleSignup)}
                className="auth-form"
              >
                <div className="form-field">
                  <label className="form-label">Email address</label>
                  <div className="input-icon-wrap">
                    <Mail size={14} className="input-icon" />
                    <input
                      className="input input-with-icon"
                      type="email"
                      placeholder="you@gmail.com"
                      autoComplete="email"
                      {...signupForm.register('email')}
                    />
                  </div>
                  {signupForm.formState.errors.email && <span className="form-error">{signupForm.formState.errors.email.message}</span>}
                </div>

                <div className="form-field">
                  <label className="form-label">Password</label>
                  <div className="input-icon-wrap">
                    <Lock size={14} className="input-icon" />
                    <input
                      className="input input-with-icon"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      autoComplete="new-password"
                      {...signupForm.register('password')}
                      style={{ paddingRight: 40 }}
                    />
                    <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {signupForm.formState.errors.password && <span className="form-error">{signupForm.formState.errors.password.message}</span>}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary auth-submit-btn"
                  disabled={signupForm.formState.isSubmitting}
                >
                  {signupForm.formState.isSubmitting
                    ? <><span className="spinner" />Creating account...</>
                    : <><span>Create Account</span><ArrowRight size={14} /></>}
                </button>

                {/* Toggle to sign in */}
                <p className="auth-switch-text">
                  Already have an account?{' '}
                  <button type="button" className="auth-switch-link" onClick={() => switchMode('login')}>
                    Sign in
                  </button>
                </p>

                {/* Divider */}
                <div className="auth-divider"><span>or continue with</span></div>

                {/* Google */}
                <GoogleBtn onClick={handleGoogleLogin} />
                <p className="auth-google-note">This uses Google OAuth 2.0 authentication.</p>
              </motion.form>
            )}
          </AnimatePresence>

          {/* ToS and Privacy */}
          <div className="auth-footer-links">
            By continuing, you agree to our{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .auth-page {
          display: flex;
          height: 100vh;
          width: 100vw;
          background: var(--bg-base);
          overflow: hidden;
        }

        /* ── Left Branding Panel ── */
        .auth-left {
          flex: 1;
          background: linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%);
          border-right: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
          position: relative;
          overflow: hidden;
        }

        .auth-left::before {
          content: '';
          position: absolute;
          top: -200px; right: -200px;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,107,71,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .auth-left-content { max-width: 440px; width: 100%; }

        .auth-logo {
          display: flex; align-items: center; gap: 10px;
          font-size: 20px; font-weight: 800;
          letter-spacing: -0.03em; color: var(--text-primary);
          margin-bottom: 48px;
        }

        .auth-hero-text h1 {
          font-size: clamp(2rem, 3.5vw, 2.8rem);
          font-weight: 800; line-height: 1.15;
          letter-spacing: -0.03em; margin-bottom: 14px;
          color: var(--text-primary);
        }

        .accent-text { color: var(--accent); }

        .auth-hero-text p {
          font-size: 15px; color: var(--text-secondary);
          line-height: 1.6; margin-bottom: 32px;
        }

        .auth-feature-list {
          display: flex; flex-direction: column;
          gap: 10px; margin-bottom: 40px;
        }

        .auth-feature-item {
          display: flex; align-items: center;
          gap: 10px; font-size: 13.5px; color: var(--text-secondary);
        }

        .auth-feature-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--accent); flex-shrink: 0;
        }

        .auth-preview { display: flex; flex-direction: column; gap: 0; position: relative; }

        .auth-preview-card {
          background: var(--bg-overlay);
          border: 1px solid var(--border-default);
          border-radius: var(--radius);
          padding: 10px 14px;
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 6px;
          backdrop-filter: blur(10px);
        }

        .auth-preview-priority { width: 3px; height: 28px; border-radius: 2px; flex-shrink: 0; }
        .priority-urgent { background: #ef4444; }
        .priority-high   { background: #f97316; }
        .priority-medium { background: #3b82f6; }

        .auth-preview-title { font-size: 12.5px; font-weight: 500; color: var(--text-primary); flex: 1; }
        .auth-preview-meta  { display: flex; align-items: center; gap: 6px; }

        /* ── Right Form Panel ── */
        .auth-right {
          width: 460px;
          display: flex; align-items: center; justify-content: center;
          padding: 40px 36px;
          background: var(--bg-base);
          overflow-y: auto;
        }

        .auth-form-container { width: 100%; max-width: 380px; }

        .auth-logo-mobile {
          display: none; align-items: center; gap: 8px;
          font-size: 17px; font-weight: 800;
          letter-spacing: -0.03em; color: var(--text-primary);
          margin-bottom: 28px;
        }

        .auth-header-text { margin-bottom: 28px; }

        .auth-header-text h2 {
          font-size: 22px; font-weight: 700;
          letter-spacing: -0.02em; color: var(--text-primary);
          margin-bottom: 6px;
        }

        .auth-header-text p {
          font-size: 13px; color: var(--text-muted); line-height: 1.5;
        }

        .auth-form { display: flex; flex-direction: column; gap: 16px; }

        .form-field  { display: flex; flex-direction: column; gap: 6px; }

        .form-label {
          font-size: 12.5px; font-weight: 600;
          color: var(--text-secondary); letter-spacing: 0.01em;
        }

        .input-icon-wrap { position: relative; display: flex; align-items: center; }

        .input-icon { position: absolute; left: 11px; color: var(--text-muted); pointer-events: none; }

        .input-with-icon { padding-left: 34px !important; }

        .input-icon-right {
          position: absolute; right: 10px;
          background: transparent; border: none;
          color: var(--text-muted); cursor: pointer;
          display: flex; transition: color var(--transition);
        }
        .input-icon-right:hover { color: var(--text-primary); }

        .form-error { font-size: 12px; color: #ef4444; font-weight: 500; }

        .auth-submit-btn {
          width: 100% !important;
          justify-content: center !important;
          padding: 11px 14px !important;
          font-size: 14px !important;
          gap: 6px;
          margin-top: 2px;
        }

        /* ── Toggle text ── */
        .auth-switch-text {
          text-align: center;
          font-size: 13px;
          color: var(--text-muted);
          margin: 2px 0 0;
        }

        .auth-switch-link {
          color: var(--accent);
          background: transparent; border: none;
          cursor: pointer; font-size: 13px;
          font-weight: 600;
          font-family: var(--font-display);
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: opacity var(--transition);
        }
        .auth-switch-link:hover { opacity: 0.75; }

        /* ── Divider ── */
        .auth-divider {
          position: relative; text-align: center;
          margin: 6px 0;
        }
        .auth-divider::before {
          content: '';
          position: absolute; top: 50%; left: 0; right: 0;
          height: 1px; background: var(--border-subtle);
        }
        .auth-divider span {
          position: relative;
          background: var(--bg-base);
          padding: 0 12px;
          font-size: 11px; color: var(--text-muted);
          font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em;
        }

        /* ── Google Button ── */
        .google-btn {
          display: flex; align-items: center; justify-content: center;
          gap: 10px; width: 100%;
          padding: 10px 14px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius);
          color: var(--text-primary);
          font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: var(--font-display);
          transition: all var(--transition);
        }
        .google-btn:hover {
          background: var(--bg-surface);
          border-color: var(--border-strong);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .auth-google-note {
          text-align: center;
          font-size: 11px;
          color: var(--text-muted);
          opacity: 0.7;
          margin-top: -4px;
        }

        /* ── Spinner ── */
        .spinner {
          display: inline-block;
          width: 13px; height: 13px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          margin-right: 6px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .auth-left { display: none; }
          .auth-right { width: 100%; padding: 28px 20px; }
          .auth-logo-mobile { display: flex; }
        }

        /* ── Footer Links ── */
        .auth-footer-links {
          text-align: center;
          font-size: 11.5px;
          color: var(--text-muted);
          margin-top: 24px;
          line-height: 1.6;
        }

        .auth-footer-links a {
          color: var(--text-secondary);
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color var(--transition);
        }

        .auth-footer-links a:hover {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
        <CheckSquare size={28} style={{ color: 'var(--accent)', opacity: 0.5 }} />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}

function GoogleBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="google-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Continue with Google
    </button>
  );
}
