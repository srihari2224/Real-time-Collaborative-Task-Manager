'use client';

import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import {
  CheckSquare, Calendar, Settings, LogOut, Plus,
  Loader2, X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { workspacesApi, projectsApi, type ApiWorkspace, type ApiProject } from '@/lib/apiClient';
import { getInitials } from '@/lib/utils';
import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const { user, logout } = useAuthStore();

  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<ApiWorkspace[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#2563eb');
  const [creating, setCreating] = useState(false);

  const workspaceId = params?.workspaceId as string | undefined;
  const currentWorkspace = workspaces.find((w) => w.id === workspaceId) ?? workspaces[0];

  useEffect(() => {
    setLoadingWorkspaces(true);
    workspacesApi.list()
      .then(setWorkspaces)
      .catch(() => setWorkspaces([]))
      .finally(() => setLoadingWorkspaces(false));
  }, []);

  useEffect(() => {
    if (loadingWorkspaces) return;
    const nonWorkspaceRoutes = ['/inbox', '/settings', '/my-tasks', '/profile'];
    const isNonWorkspaceRoute = nonWorkspaceRoutes.some((route) => pathname.startsWith(route));
    if (isNonWorkspaceRoute) return;
    if (workspaceId || !workspaces.length) return;
    router.replace(`/workspace/${workspaces[0].id}`);
  }, [loadingWorkspaces, workspaceId, workspaces, router, pathname]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    setLoadingProjects(true);
    projectsApi
      .listByWorkspace(currentWorkspace.id)
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, [currentWorkspace?.id]);

  const calendarHref = currentWorkspace
    ? `/workspace/${currentWorkspace.id}/calendar`
    : '#';

  const navItems: { href: string; icon: ReactNode; label: string; isActive: boolean; disabled?: boolean }[] = [
    { href: '/my-tasks', icon: <CheckSquare size={15} />, label: 'My Tasks', isActive: pathname === '/my-tasks' },
    {
      href: calendarHref,
      icon: <Calendar size={15} />,
      label: 'Calendar',
      isActive: pathname.includes('/calendar'),
      disabled: !currentWorkspace,
    },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push('/auth');
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    setCreating(true);
    try {
      const ws = await workspacesApi.create({ name: newWorkspaceName.trim() });
      setWorkspaces((prev) => [...prev, ws]);
      setNewWorkspaceName('');
      setShowNewWorkspace(false);
      router.push(`/workspace/${ws.id}`);
      toast.success('Workspace created!');
    } catch {
      toast.error('Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !currentWorkspace) return;
    setCreating(true);
    try {
      const proj = await projectsApi.create({
        workspaceId: currentWorkspace.id,
        name: newProjectName.trim(),
        color: newProjectColor,
      });
      setProjects((prev) => [...prev, proj]);
      setNewProjectName('');
      setShowNewProject(false);
      router.push(`/workspace/${currentWorkspace.id}/project/${proj.id}`);
      toast.success('Project created!');
    } catch {
      toast.error('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const wsLetter = currentWorkspace?.name?.[0]?.toUpperCase() ?? 'W';

  return (
    <>
      <nav className="sidebar">
        {/* Workspace Header */}
        <div
          className="sidebar-workspace"
          onClick={() => setWorkspaceSwitcherOpen(!workspaceSwitcherOpen)}
        >
          <div className="workspace-logo">{wsLetter}</div>
          <div className="workspace-info">
            <span className="workspace-name">
              {currentWorkspace?.name ?? (loadingWorkspaces ? 'Loading...' : 'No workspace')}
            </span>
            <span className="workspace-plan">Free plan</span>
          </div>
        </div>

        {/* Workspace Switcher */}
        <AnimatePresence>
          {workspaceSwitcherOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="workspace-dropdown">
                <div className="sidebar-section-label">Workspaces</div>
                {workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    className={`sidebar-nav-item ${ws.id === currentWorkspace?.id ? 'active' : ''}`}
                    style={{ justifyContent: 'space-between', cursor: 'pointer' }}
                    onClick={() => { router.push(`/workspace/${ws.id}`); setWorkspaceSwitcherOpen(false); }}
                  >
                    <span>{ws.name}</span>
                    {ws.id === currentWorkspace?.id && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                    )}
                  </div>
                ))}
                <button
                  onClick={() => { setShowNewWorkspace(true); setWorkspaceSwitcherOpen(false); }}
                  className="sidebar-nav-item sidebar-add-btn"
                  style={{ width: '100%', border: 'none', cursor: 'pointer', marginTop: 4 }}
                >
                  <Plus size={13} /> Create Workspace
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav Items */}
        <div className="sidebar-section">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`sidebar-nav-item ${item.isActive ? 'active' : ''}${item.disabled ? ' disabled' : ''}`}
              aria-disabled={item.disabled}
              onClick={(e) => { if (item.disabled) e.preventDefault(); }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Projects */}
        <div className="sidebar-section sidebar-projects">
          <div className="sidebar-section-header">
            <span className="sidebar-section-label" style={{ padding: 0 }}>Projects</span>
            <button
              className="sidebar-icon-btn"
              title="New project"
              onClick={() => setShowNewProject(true)}
              disabled={!currentWorkspace}
            >
              <Plus size={13} />
            </button>
          </div>
          <div className="scroll-y" style={{ flex: 1 }}>
            {loadingProjects ? (
              <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                <Loader2 size={12} className="spin" />
                Loading...
              </div>
            ) : projects.length === 0 ? (
              <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                No projects yet
                {currentWorkspace && (
                  <button
                    onClick={() => setShowNewProject(true)}
                    style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-display)', fontWeight: 600 }}
                  >
                    + Create first project
                  </button>
                )}
              </div>
            ) : (
              projects.map((project) => {
                const isActive = pathname.includes(project.id);
                return (
                  <Link
                    key={project.id}
                    href={`/workspace/${currentWorkspace?.id}/project/${project.id}`}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <span className="project-dot" style={{ background: project.color ?? 'var(--accent)' }} />
                    <span className="truncate-1" style={{ flex: 1, fontSize: 13 }}>{project.name}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="sidebar-settings">
          <Link
            href="/settings"
            className={`sidebar-nav-item ${pathname === '/settings' ? 'active' : ''}`}
          >
            <span className="nav-icon"><Settings size={15} /></span>
            <span>Settings</span>
          </Link>
        </div>

        {/* User Footer */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {(user as any)?.avatar_url ? (
              <img
                src={(user as any).avatar_url}
                alt="avatar"
                style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                {user ? getInitials((user as any).full_name || (user as any).name || user.email) : 'U'}
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
              {(user as any)?.full_name || (user as any)?.name || 'User'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
              {user?.email || ''}
            </div>
          </div>
          <button className="sidebar-icon-btn" onClick={handleLogout} title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </nav>

      {/* ── New Workspace Modal ── */}
      <AnimatePresence>
        {showNewWorkspace && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowNewWorkspace(false)}
          >
            <motion.div
              className="modal-card"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="modal-title">New Workspace</h3>
                <button className="modal-close-btn" onClick={() => setShowNewWorkspace(false)}><X size={15} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input
                  autoFocus className="input" placeholder="Workspace name"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setShowNewWorkspace(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleCreateWorkspace} disabled={creating || !newWorkspaceName.trim()}>
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── New Project Modal ── */}
      <AnimatePresence>
        {showNewProject && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowNewProject(false)}
          >
            <motion.div
              className="modal-card"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="modal-title">New Project</h3>
                <button className="modal-close-btn" onClick={() => setShowNewProject(false)}><X size={15} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input
                  autoFocus className="input" placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                />
                <div>
                  <label className="field-label" style={{ display: 'block', marginBottom: 8 }}>Color</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['#2563eb', '#6366f1', '#f97316', '#22c55e', '#ec4899', '#06b6d4', '#f59e0b', '#ef4444'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewProjectColor(c)}
                        style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: c,
                          border: newProjectColor === c ? `3px solid var(--bg-surface)` : '2px solid transparent',
                          cursor: 'pointer',
                          outline: newProjectColor === c ? `2px solid ${c}` : 'none',
                          transition: 'transform 150ms ease',
                          transform: newProjectColor === c ? 'scale(1.15)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setShowNewProject(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleCreateProject} disabled={creating || !newProjectName.trim()}>
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .sidebar-workspace {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 12px 12px;
          cursor: pointer;
          border-bottom: 1px solid var(--border-subtle);
          transition: background var(--transition);
          flex-shrink: 0;
          user-select: none;
        }
        .sidebar-workspace:hover { background: var(--bg-hover); }

        .workspace-logo {
          width: 32px;
          height: 32px;
          border-radius: var(--radius);
          background: linear-gradient(135deg, #2563eb 0%, #60a5fa 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 2px 10px rgba(37,99,235,0.35);
          letter-spacing: -0.02em;
        }
        .workspace-info { flex: 1; overflow: hidden; }
        .workspace-name {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.3;
          letter-spacing: -0.01em;
        }
        .workspace-plan {
          display: block;
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 500;
          margin-top: 1px;
        }

        .workspace-dropdown {
          padding: 6px 8px 8px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-elevated);
        }
        .sidebar-section-label {
          padding: 6px 10px 8px;
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .sidebar-add-btn {
          color: var(--accent) !important;
          font-size: 12.5px;
        }

        .sidebar-section {
          padding: 6px 0;
          border-bottom: 1px solid var(--border-subtle);
        }
        .sidebar-projects {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border-bottom: 1px solid var(--border-subtle);
        }
        .sidebar-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 12px 4px 14px;
          min-height: 30px;
        }

        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: inherit;
        }

        .project-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .sidebar-icon-btn {
          width: 24px;
          height: 24px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition);
          flex-shrink: 0;
        }
        .sidebar-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
        .sidebar-icon-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .sidebar-settings {
          padding: 6px 0;
          border-top: 1px solid var(--border-subtle);
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          flex-shrink: 0;
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-elevated);
        }
        .sidebar-user-avatar { flex-shrink: 0; }

        /* Modal styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(4px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 24px;
          width: 380px;
          max-width: 90vw;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(37,99,235,0.06);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .modal-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        .modal-close-btn {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition);
        }
        .modal-close-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

        .field-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}