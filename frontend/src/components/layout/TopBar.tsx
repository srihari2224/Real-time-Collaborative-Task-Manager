'use client';

import { useEffect, useState } from 'react';
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
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    notificationsApi
      .list()
      .then(({ unread_count, notifications }) => {
        setUnread(unread_count || notifications.filter((n) => !n.is_read).length);
      })
      .catch(() => setUnread(0));
  }, []);

  const displayName = (user as { full_name?: string; name?: string } | null)?.full_name
    ?? (user as { name?: string } | null)?.name
    ?? '';
  const avatarUrl = (user as { avatar_url?: string | null } | null)?.avatar_url;

  return (
    <div className="topbar">
      {title && <h1 className="topbar-title">{title}</h1>}

      <div className="topbar-actions">
        {actions}

        <button
          type="button"
          onClick={toggleTheme}
          title="Toggle theme"
          className="topbar-icon-btn"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <Link
          href="/inbox"
          className="topbar-icon-btn topbar-bell"
          style={{ textDecoration: 'none' }}
          title="Notifications"
        >
          <Bell size={15} />
          {unread > 0 && <span className="topbar-badge" />}
        </Link>

        <Link
          href="/settings"
          className="topbar-avatar-link"
          title="Settings"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="topbar-avatar-img" />
          ) : (
            <span className="topbar-avatar-fallback">
              {user ? getInitials(displayName || user.email || 'U') : 'U'}
            </span>
          )}
        </Link>
      </div>

      <style jsx>{`
        .topbar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 20px;
          height: 52px;
          flex-shrink: 0;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-surface);
        }

        .topbar-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.025em;
          margin: 0;
          margin-right: auto;
          line-height: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .topbar-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .topbar-icon-btn {
          width: 36px;
          height: 36px;
          border-radius: var(--radius);
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition);
          position: relative;
        }
        .topbar-icon-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .topbar-bell {
          color: var(--text-muted);
        }

        .topbar-badge {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent);
          border: 2px solid var(--bg-surface);
          animation: badge-pulse 2s infinite;
        }

        @keyframes badge-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.4); }
          50% { box-shadow: 0 0 0 4px rgba(37,99,235,0); }
        }

        .topbar-avatar-link {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-default);
          transition: box-shadow var(--transition), transform var(--transition);
        }
        .topbar-avatar-link:hover {
          box-shadow: 0 0 0 2px var(--accent-soft, rgba(37,99,235,0.2));
          transform: scale(1.04);
        }

        .topbar-avatar-img {
          width: 36px;
          height: 36px;
          min-width: 0;
          min-height: 0;
          object-fit: cover;
        }

        .topbar-avatar-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          color: var(--accent);
          background: var(--bg-elevated);
          font-family: var(--font-display);
        }
      `}</style>
    </div>
  );
}
