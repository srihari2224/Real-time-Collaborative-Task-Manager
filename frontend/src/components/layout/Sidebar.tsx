'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, CheckSquare, Bell, Settings, LogOut, Plus,
  Globe, Smartphone, Palette, ChevronDown, CheckSquare as TFLogo, X
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { WORKSPACE, PROJECTS, NOTIFICATIONS } from '@/data/seed';
import { getInitials } from '@/lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PROJECT_ICONS: Record<string, React.ReactNode> = {
  globe: <Globe size={14} />,
  smartphone: <Smartphone size={14} />,
  palette: <Palette size={14} />,
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, logout } = useAuthStore();
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);

  const unreadCount = NOTIFICATIONS.filter((n) => !n.is_read).length;

  const navItems = [
    { href: `/workspace/${WORKSPACE.id}`, icon: <Home size={15} />, label: 'Home' },
    { href: '/my-tasks', icon: <CheckSquare size={15} />, label: 'My Tasks' },
    { href: '/inbox', icon: <Bell size={15} />, label: 'Inbox', badge: unreadCount },
  ];

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="sidebar-mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{ display: 'none' }}
          />
        )}
      </AnimatePresence>

      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Workspace Header */}
        <div className="sidebar-workspace" onClick={() => setWorkspaceSwitcherOpen(!workspaceSwitcherOpen)}>
          <div className="workspace-logo">
            A
          </div>
          <div className="workspace-info">
            <span className="workspace-name">{WORKSPACE.name}</span>
            <span className="workspace-plan">Free plan</span>
          </div>
          <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, transition: 'transform 150ms', transform: workspaceSwitcherOpen ? 'rotate(180deg)' : 'none' }} />
        </div>

        {/* Workspace Switcher Dropdown */}
        <AnimatePresence>
          {workspaceSwitcherOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>WORKSPACES</div>
                <div className="sidebar-nav-item active" style={{ justifyContent: 'space-between' }}>
                  <span>Acme Design Team</span>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                </div>
                <button onClick={() => {}} className="sidebar-nav-item" style={{ width: '100%', border: 'none', cursor: 'pointer', marginTop: 4 }}>
                  <Plus size={13} /> Create Workspace
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav Items */}
        <div className="sidebar-section">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`sidebar-nav-item ${isActive ? 'active' : ''}`}>
                {item.icon}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge ? (
                  <span className="notification-badge" style={{ animation: 'none', minWidth: 17, height: 17, fontSize: 10 }}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>

        {/* Projects */}
        <div className="sidebar-section" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="sidebar-section-header">
            <span>Projects</span>
            <button className="sidebar-icon-btn" title="New project">
              <Plus size={13} />
            </button>
          </div>
          <div className="scroll-y" style={{ flex: 1 }}>
            {PROJECTS.map((project) => {
              const isActive = pathname.includes(project.id);
              return (
                <Link
                  key={project.id}
                  href={`/workspace/${WORKSPACE.id}/project/${project.id}`}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <span style={{ color: project.color, flexShrink: 0 }}>
                    {PROJECT_ICONS[project.icon || 'globe']}
                  </span>
                  <span className="truncate-1" style={{ flex: 1 }}>{project.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Settings */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px' }}>
          <Link href="/settings" className={`sidebar-nav-item ${pathname === '/settings' ? 'active' : ''}`}>
            <Settings size={15} />
            <span>Settings</span>
          </Link>
        </div>

        {/* User Footer */}
        <div className="sidebar-user">
          <div className="avatar" style={{ width: 32, height: 32, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, flexShrink: 0 }}>
            {user ? getInitials(user.name) : 'U'}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email || ''}
            </div>
          </div>
          <button className="sidebar-icon-btn" onClick={handleLogout} title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </nav>

      <style jsx>{`
        .sidebar-workspace {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 14px 12px;
          cursor: pointer;
          border-bottom: 1px solid var(--border-subtle);
          transition: background var(--transition);
          flex-shrink: 0;
        }
        .sidebar-workspace:hover {
          background: var(--bg-hover);
        }
        .workspace-logo {
          width: 28px;
          height: 28px;
          border-radius: var(--radius);
          background: linear-gradient(135deg, var(--accent), #ff9d85);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          color: white;
          flex-shrink: 0;
        }
        .workspace-info {
          flex: 1;
          overflow: hidden;
        }
        .workspace-name {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.3;
        }
        .workspace-plan {
          display: block;
          font-size: 10.5px;
          color: var(--text-muted);
          font-weight: 500;
        }
        .sidebar-section {
          padding: 8px 0;
          border-bottom: 1px solid var(--border-subtle);
        }
        .sidebar-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 14px 6px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .sidebar-icon-btn {
          width: 22px;
          height: 22px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition);
        }
        .sidebar-icon-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          min-height: 56px;
          flex-shrink: 0;
          border-top: 1px solid var(--border-subtle);
        }
      `}</style>
    </>
  );
}
