'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Sun, Moon, Bell, Menu } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { notificationsApi } from '@/lib/apiClient';
import { getInitials } from '@/lib/utils';

interface TopBarProps {
  title?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, actions }: TopBarProps) {
  const { theme, toggleTheme, toggleSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    notificationsApi
      .list()
      .then(({ unread_count, notifications }) => {
        const count = unread_count || notifications.filter((n) => !n.is_read).length;
        if (count > 0) document.documentElement.setAttribute('data-unread', 'true');
        else document.documentElement.removeAttribute('data-unread');
      })
      .catch(() => {});
  }, []);

  const displayName =
    (user as { full_name?: string } | null)?.full_name ??
    (user as { name?: string } | null)?.name ??
    '';

  return (
    <div className="topbar">
      {/* Sidebar toggle moved to left of title */}
      <button
        type="button"
        className="topbar-icon-btn topbar-left-icon"
        aria-label="Toggle sidebar"
        onClick={() => toggleSidebar()}
      >
        <Menu size={22} strokeWidth={2} />
      </button>
      {title && <h1 className="topbar-title">{title}</h1>}

      <div className="topbar-actions">
        {actions}

        {/* Sign in / Sign up links */}
        {!user ? (
          <>
            <Link href="/auth" className="topbar-link">Sign in</Link>
            <span className="topbar-divider" />
            <Link href="/auth/signup" className="topbar-link btn btn-primary">Sign up</Link>
          </>
        ) : null}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="topbar-icon-btn"
          aria-label="Toggle theme"
        >
          {theme === 'dark'
            ? <Sun size={18} strokeWidth={2} />
            : <Moon size={18} strokeWidth={2} />}
        </button>

        {/* Bell — blue when there are unread notifications */}
        <Link href="/inbox" className="topbar-icon-btn topbar-bell" title="Notifications">
          <Bell size={18} strokeWidth={2} />
        </Link>

        {/* Removed duplicate sidebar toggle; left-hand toggle remains */}
      </div>

      <style jsx>{`
        .topbar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 20px;
          height: 52px;
          flex-shrink: 0;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-surface);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .topbar-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-secondary);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin: 0;
          margin-right: auto;
          line-height: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: var(--font-mono, 'Space Mono', monospace);
        }

        .topbar-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .topbar-icon-btn {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: background 150ms ease, color 150ms ease;
          text-decoration: none;
          border-radius: 0;
        }
        .topbar-icon-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        /* Bell turns accent color when unread */
        html[data-unread] .topbar-bell {
          color: var(--accent);
        }

        /* User initials chip */
        .topbar-user-chip {
          height: 30px;
          min-width: 30px;
          padding: 0 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          font-family: var(--font-mono, 'Space Mono', monospace);
          background: var(--accent-soft, rgba(59,130,246,0.12));
          color: var(--accent, #3b82f6);
          border: 1px solid rgba(59,130,246,0.25);
          text-decoration: none;
          letter-spacing: 0.08em;
          transition: all 150ms ease;
          cursor: pointer;
          margin-left: 4px;
        }
        .topbar-user-chip:hover {
          background: var(--accent, #3b82f6);
          color: #ffffff;
        }
        /* Left icon (sidebar) styling — bigger and aligned */
        .topbar-left-icon { margin-right: 8px; width: 48px; height: 48px; }
        .topbar-left-icon svg { width: 24px; height: 24px; }
        /* Make icons larger in topbar actions */
        .topbar-actions .topbar-icon-btn svg { width: 20px; height: 20px; }
        .topbar-link {
          color: var(--text-secondary);
          text-decoration: none;
          padding: 6px 10px;
          font-weight: 700;
          margin-right: 6px;
        }
        .topbar-divider {
          width: 1px; height: 22px; background: var(--border-subtle); margin: 0 8px; display: inline-block;
        }
      `}</style>
    </div>
  );
}
