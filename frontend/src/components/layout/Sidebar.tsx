'use client';

import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import {
  Home, CheckSquare, Bell, Settings, LogOut, Plus,
  ChevronDown, FolderKanban, Loader2, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { workspacesApi, projectsApi, notificationsApi, type ApiWorkspace, type ApiProject } from '@/lib/apiClient';
import { getInitials } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();

  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<ApiWorkspace[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  // Modal states
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#6366f1');
  const [creating, setCreating] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);

  const workspaceId = params?.workspaceId as string | undefined;
  const currentWorkspace = workspaces.find((w) => w.id === workspaceId) ?? workspaces[0];

  // Load workspaces
  useEffect(() => {
    setLoadingWorkspaces(true);
    workspacesApi.list()
      .then(setWorkspaces)
      .catch(() => setWorkspaces([]))
      .finally(() => setLoadingWorkspaces(false));
  }, []);

  // If user lands outside a workspace route, hydrate to first workspace.
  useEffect(() => {
    if (loadingWorkspaces) return;
    if (workspaceId || !workspaces.length) return;
    router.replace(`/workspace/${workspaces[0].id}`);
  }, [loadingWorkspaces, workspaceId, workspaces, router]);

  // Load notification count
  useEffect(() => {
    notificationsApi.list().then(({ notifications }) => {
      setUnreadCount(notifications.filter((n) => !n.is_read).length);
    }).catch(() => {});
  }, []);

  // Load projects when workspace changes
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    setLoadingProjects(true);
    projectsApi
      .listByWorkspace(currentWorkspace.id)
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, [currentWorkspace?.id]);

  const navItems = [
    { href: currentWorkspace ? `/workspace/${currentWorkspace.id}` : '#', icon: <Home size={15} />, label: 'Home' },
    { href: '/my-tasks', icon: <CheckSquare size={15} />, label: 'My Tasks' },
    { href: '/inbox', icon: <Bell size={15} />, label: 'Inbox', badge: unreadCount },
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
      <nav className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        {/* Collapse toggle button */}
        <button
          onClick={toggleSidebar}
          className="sidebar-toggle-btn"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
        </button>

        {/* Workspace Header */}
        <div className="sidebar-workspace" onClick={() => !sidebarOpen ? toggleSidebar() : setWorkspaceSwitcherOpen(!workspaceSwitcherOpen)}>
          <div className="workspace-logo">{wsLetter}</div>
          {sidebarOpen && (
            <div className="workspace-info">
              <span className="workspace-name">
                {currentWorkspace?.name ?? (loadingWorkspaces ? 'Loading...' : 'No workspace')}
              </span>
              <span className="workspace-plan">Free plan</span>
            </div>
          )}
          {sidebarOpen && <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, transition: 'transform 150ms', transform: workspaceSwitcherOpen ? 'rotate(180deg)' : 'none' }} />}
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
                  className="sidebar-nav-item"
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
          {navItems.map((item: any) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && (
                  <>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge > 0 && (
                      <span className="notification-badge" style={{ fontSize: 9, minWidth: 16, height: 16 }}>{item.badge}</span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>

        {/* Projects */}
        <div className="sidebar-section" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="sidebar-section-header">
            {sidebarOpen && <span>Projects</span>}
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
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                <Loader2 size={12} className="spin" /> {sidebarOpen && 'Loading...'}
              </div>
            ) : projects.length === 0 && sidebarOpen ? (
              <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                No projects yet
                {currentWorkspace && (
                  <button onClick={() => setShowNewProject(true)} style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-display)' }}>
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
                    title={!sidebarOpen ? project.name : undefined}
                  >
                    <span style={{ color: project.color ?? 'var(--accent)', flexShrink: 0 }}>
                      <FolderKanban size={14} />
                    </span>
                    {sidebarOpen && <span className="truncate-1" style={{ flex: 1 }}>{project.name}</span>}
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Settings */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px' }}>
          <Link href="/settings" className={`sidebar-nav-item ${pathname === '/settings' ? 'active' : ''}`} title={!sidebarOpen ? 'Settings' : undefined}>
            <Settings size={15} />
            {sidebarOpen && <span>Settings</span>}
          </Link>
        </div>

        {/* User Footer */}
        <div className="sidebar-user">
          {(user as any)?.avatar_url ? (
            <img src={(user as any).avatar_url} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--accent-soft)' }} />
          ) : (
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>
              {user ? getInitials((user as any).full_name || (user as any).name || user.email) : 'U'}
            </div>
          )}
          {sidebarOpen && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(user as any)?.full_name || (user as any)?.name || 'User'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email || ''}
              </div>
            </div>
          )}
          <button className="sidebar-icon-btn" onClick={handleLogout} title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </nav>

      {/* ── New Workspace Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showNewWorkspace && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowNewWorkspace(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 24, width: 360, maxWidth: '90vw' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>New Workspace</h3>
                <button onClick={() => setShowNewWorkspace(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={15} /></button>
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

      {/* ── New Project Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showNewProject && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowNewProject(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 24, width: 360, maxWidth: '90vw' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>New Project</h3>
                <button onClick={() => setShowNewProject(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={15} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input
                  autoFocus className="input" placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                />
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Color</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['#6366f1', '#f97316', '#22c55e', '#ec4899', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewProjectColor(c)}
                        style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: newProjectColor === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer', transition: 'transform var(--transition)', boxShadow: newProjectColor === c ? `0 0 0 2px ${c}` : 'none' }}
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
          padding: 14px 14px 12px;
          cursor: pointer;
          border-bottom: 1px solid var(--border-subtle);
          transition: background var(--transition);
          flex-shrink: 0;
        }
        .sidebar-workspace:hover { background: var(--bg-hover); }
        .workspace-logo {
          width: 32px;
          height: 32px;
          border-radius: var(--radius);
          background: linear-gradient(135deg, #2563eb, #60a5fa);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(37,99,235,0.3);
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
        .sidebar-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
        .sidebar-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          min-height: 56px;
          flex-shrink: 0;
          border-top: 1px solid var(--border-subtle);
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
