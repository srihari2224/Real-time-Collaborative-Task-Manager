'use client';

import { Menu, Search, Sun, Moon, Bell, CheckSquare as Logo } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { NOTIFICATIONS } from '@/data/seed';
import Link from 'next/link';

interface TopBarProps {
  title?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, actions }: TopBarProps) {
  const { setSidebarOpen, sidebarOpen, setSearchOpen, theme, toggleTheme } = useUIStore();
  const unread = NOTIFICATIONS.filter((n) => !n.is_read).length;

  return (
    <div className="topbar">
      <button
        className="sidebar-icon-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title="Toggle sidebar"
        style={{ width: 32, height: 32, borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all var(--transition)', flexShrink: 0 }}
      >
        <Menu size={16} />
      </button>

      {title && (
        <h1 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginRight: 'auto' }}>
          {title}
        </h1>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Search trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 12px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 12.5,
            fontFamily: 'var(--font-display)',
            transition: 'all var(--transition)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <Search size={13} />
          <span>Search</span>
          <kbd style={{ fontSize: 10, background: 'var(--bg-overlay)', padding: '1px 5px', borderRadius: 3, border: '1px solid var(--border-default)' }}>⌘K</kbd>
        </button>

        {actions}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle theme"
          style={{ width: 32, height: 32, borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all var(--transition)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notification Bell */}
        <Link
          href="/inbox"
          style={{ width: 32, height: 32, borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: 'var(--text-muted)', position: 'relative', transition: 'all var(--transition)', textDecoration: 'none' }}
        >
          <Bell size={15} />
          {unread > 0 && (
            <span style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: 'var(--accent)',
              border: '1.5px solid var(--bg-surface)',
              animation: 'badge-pulse 2s infinite',
            }} />
          )}
        </Link>
      </div>
    </div>
  );
}
