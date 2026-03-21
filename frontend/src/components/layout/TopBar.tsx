'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Sun, Moon, Bell } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { notificationsApi } from '@/lib/apiClient';
import { getInitials } from '@/lib/utils';

interface TopBarProps {
  title?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, actions }: TopBarProps) {
  const { theme, toggleTheme } = useUIStore();
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
      {title && <h1 className="topbar-title">{title}</h1>}

      <div className="topbar-actions">
        {actions}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="topbar-icon-btn"
          aria-label="Toggle theme"
        >
          {theme === 'dark'
            ? <Sun size={15} strokeWidth={1.8} />
            : <Moon size={15} strokeWidth={1.8} />}
        </button>

        {/* Bell — blue when there are unread notifications */}
        <Link href="/inbox" className="topbar-icon-btn topbar-bell" title="Notifications">
          <Bell size={15} strokeWidth={1.8} />
        </Link>

        {/* User initials chip — links to settings */}
        <Link
          href="/settings"
          className="topbar-user-chip"
          title="Settings"
          aria-label="Go to settings"
        >
          {getInitials(displayName || user?.email || 'U')}
        </Link>
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
          width: 34px;
          height: 34px;
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
      `}</style>
    </div>
  );
}
