'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, CheckSquare, ArrowRight, Mail, Lock, User, Chrome } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { CURRENT_USER, WORKSPACE } from '@/data/seed';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;
type ForgotForm = z.infer<typeof forgotSchema>;
type Tab = 'login' | 'signup' | 'forgot';

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>('login');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });
  const forgotForm = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema) });

  const handleLogin = async (data: LoginForm) => {
    await new Promise((r) => setTimeout(r, 800));
    setUser(CURRENT_USER);
    setToken('demo-token-abc123');
    toast.success('Welcome back, ' + CURRENT_USER.name + '!');
    router.push(`/workspace/${WORKSPACE.id}`);
  };

  const handleSignup = async (data: SignupForm) => {
    await new Promise((r) => setTimeout(r, 800));
    setUser({ ...CURRENT_USER, name: data.name, email: data.email });
    setToken('demo-token-abc123');
    toast.success('Account created! Welcome to TaskFlow.');
    router.push(`/workspace/${WORKSPACE.id}`);
  };

  const handleForgot = async (data: ForgotForm) => {
    await new Promise((r) => setTimeout(r, 600));
    toast.success('Password reset link sent to ' + data.email);
    setTab('login');
  };

  const handleGoogleSSO = () => {
    toast.success('Signing in with Google...');
    setTimeout(() => {
      setUser(CURRENT_USER);
      setToken('demo-token-abc123');
      router.push(`/workspace/${WORKSPACE.id}`);
    }, 1200);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'login', label: 'Sign In' },
    { key: 'signup', label: 'Create Account' },
  ];

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

          {/* Decorative Cards Preview */}
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
          <div className="auth-form-header">
            <div className="auth-logo-mobile">
              <CheckSquare size={22} style={{ color: 'var(--accent)' }} />
              <span>TaskFlow</span>
            </div>
            {tab !== 'forgot' && (
              <div className="auth-tabs">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    className={`auth-tab ${tab === t.key ? 'active' : ''}`}
                    onClick={() => setTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
            {tab === 'forgot' && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Forgot Password?</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>We&apos;ll send you a reset link.</p>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'login' && (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={loginForm.handleSubmit(handleLogin)}
                className="auth-form"
              >
                <div className="form-field">
                  <label className="form-label">Email</label>
                  <div className="input-icon-wrap">
                    <Mail size={14} className="input-icon" />
                    <input className="input input-with-icon" type="email" placeholder="you@company.com" {...loginForm.register('email')} />
                  </div>
                  {loginForm.formState.errors.email && <span className="form-error">{loginForm.formState.errors.email.message}</span>}
                </div>
                <div className="form-field">
                  <label className="form-label">Password</label>
                  <div className="input-icon-wrap">
                    <Lock size={14} className="input-icon" />
                    <input className="input input-with-icon" type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...loginForm.register('password')} style={{ paddingRight: 40 }} />
                    <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && <span className="form-error">{loginForm.formState.errors.password.message}</span>}
                </div>
                <button type="button" className="forgot-link" onClick={() => setTab('forgot')}>Forgot password?</button>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 14px' }} disabled={loginForm.formState.isSubmitting}>
                  {loginForm.formState.isSubmitting ? 'Signing in...' : <>Sign In <ArrowRight size={14} /></>}
                </button>
                <GoogleBtn onClick={handleGoogleSSO} />
                <Demo onClick={() => { loginForm.setValue('email', 'sarah@acme.com'); loginForm.setValue('password', 'demo123'); }} />
              </motion.form>
            )}

            {tab === 'signup' && (
              <motion.form
                key="signup"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={signupForm.handleSubmit(handleSignup)}
                className="auth-form"
              >
                <div className="form-field">
                  <label className="form-label">Full Name</label>
                  <div className="input-icon-wrap">
                    <User size={14} className="input-icon" />
                    <input className="input input-with-icon" type="text" placeholder="Sarah Chen" {...signupForm.register('name')} />
                  </div>
                  {signupForm.formState.errors.name && <span className="form-error">{signupForm.formState.errors.name.message}</span>}
                </div>
                <div className="form-field">
                  <label className="form-label">Email</label>
                  <div className="input-icon-wrap">
                    <Mail size={14} className="input-icon" />
                    <input className="input input-with-icon" type="email" placeholder="you@company.com" {...signupForm.register('email')} />
                  </div>
                  {signupForm.formState.errors.email && <span className="form-error">{signupForm.formState.errors.email.message}</span>}
                </div>
                <div className="form-field">
                  <label className="form-label">Password</label>
                  <div className="input-icon-wrap">
                    <Lock size={14} className="input-icon" />
                    <input className="input input-with-icon" type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters" {...signupForm.register('password')} style={{ paddingRight: 40 }} />
                    <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {signupForm.formState.errors.password && <span className="form-error">{signupForm.formState.errors.password.message}</span>}
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 14px' }} disabled={signupForm.formState.isSubmitting}>
                  {signupForm.formState.isSubmitting ? 'Creating account...' : <>Create Account <ArrowRight size={14} /></>}
                </button>
                <GoogleBtn onClick={handleGoogleSSO} />
              </motion.form>
            )}

            {tab === 'forgot' && (
              <motion.form
                key="forgot"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={forgotForm.handleSubmit(handleForgot)}
                className="auth-form"
              >
                <div className="form-field">
                  <label className="form-label">Email Address</label>
                  <div className="input-icon-wrap">
                    <Mail size={14} className="input-icon" />
                    <input className="input input-with-icon" type="email" placeholder="you@company.com" {...forgotForm.register('email')} />
                  </div>
                  {forgotForm.formState.errors.email && <span className="form-error">{forgotForm.formState.errors.email.message}</span>}
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 14px' }} disabled={forgotForm.formState.isSubmitting}>
                  {forgotForm.formState.isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setTab('login')}>
                  Back to Sign In
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          display: flex;
          height: 100vh;
          width: 100vw;
          background: var(--bg-base);
          overflow: hidden;
        }

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
          top: -200px;
          right: -200px;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 107, 71, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .auth-left-content {
          max-width: 440px;
          width: 100%;
        }

        .auth-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          margin-bottom: 48px;
        }

        .auth-hero-text h1 {
          font-size: clamp(2rem, 3.5vw, 2.8rem);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin-bottom: 14px;
          color: var(--text-primary);
        }

        .accent-text {
          color: var(--accent);
        }

        .auth-hero-text p {
          font-size: 15px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 32px;
        }

        .auth-feature-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 40px;
        }

        .auth-feature-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          color: var(--text-secondary);
        }

        .auth-feature-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--accent);
          flex-shrink: 0;
        }

        .auth-preview {
          display: flex;
          flex-direction: column;
          gap: 0;
          position: relative;
        }

        .auth-preview-card {
          background: var(--bg-overlay);
          border: 1px solid var(--border-default);
          border-radius: var(--radius);
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
          backdrop-filter: blur(10px);
        }

        .auth-preview-priority {
          width: 3px;
          height: 28px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .priority-urgent { background: #ef4444; }
        .priority-high   { background: #f97316; }
        .priority-medium { background: #3b82f6; }

        .auth-preview-title {
          font-size: 12.5px;
          font-weight: 500;
          color: var(--text-primary);
          flex: 1;
        }

        .auth-preview-meta {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .auth-right {
          width: 440px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
          background: var(--bg-base);
          overflow-y: auto;
        }

        .auth-form-container {
          width: 100%;
          max-width: 360px;
        }

        .auth-form-header {
          margin-bottom: 28px;
        }

        .auth-logo-mobile {
          display: none;
          align-items: center;
          gap: 8px;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          margin-bottom: 20px;
        }

        .auth-tabs {
          display: flex;
          gap: 0;
          background: var(--bg-elevated);
          border-radius: var(--radius);
          padding: 3px;
          width: fit-content;
        }

        .auth-tab {
          padding: 7px 16px;
          border-radius: calc(var(--radius) - 2px);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          cursor: pointer;
          border: none;
          background: transparent;
          transition: all var(--transition);
        }

        .auth-tab.active {
          background: var(--bg-surface);
          color: var(--text-primary);
          font-weight: 600;
          box-shadow: var(--shadow-sm);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
          letter-spacing: 0.01em;
        }

        .input-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 11px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .input-with-icon {
          padding-left: 34px !important;
        }

        .input-icon-right {
          position: absolute;
          right: 10px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          transition: color var(--transition);
        }

        .input-icon-right:hover {
          color: var(--text-primary);
        }

        .form-error {
          font-size: 12px;
          color: #ef4444;
          font-weight: 500;
        }

        .forgot-link {
          font-size: 12.5px;
          color: var(--accent);
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: right;
          font-family: var(--font-display);
          font-weight: 500;
          margin-top: -8px;
          transition: opacity var(--transition);
        }

        .forgot-link:hover {
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .auth-left { display: none; }
          .auth-right { width: 100%; padding: 24px 20px; }
          .auth-logo-mobile { display: flex; }
        }
      `}</style>
    </div>
  );
}

function GoogleBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%',
      padding: '9px 14px',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius)',
      color: 'var(--text-primary)',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'var(--font-display)',
      transition: 'all var(--transition)',
    }}>
      <Chrome size={15} style={{ color: '#4285F4' }} />
      Continue with Google
    </button>
  );
}

function Demo({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      fontSize: 11.5,
      color: 'var(--text-muted)',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-display)',
      textAlign: 'center',
    }}>
      Use demo credentials: sarah@acme.com / demo123
    </button>
  );
}
