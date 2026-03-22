'use client';

import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import {
  CheckSquare, Calendar, Settings, LogOut, Plus, X,
  ChevronLeft, ChevronRight, Menu,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { workspacesApi, projectsApi, type ApiWorkspace, type ApiProject } from '@/lib/apiClient';
import { getInitials } from '@/lib/utils';
import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const [isMobile, setIsMobile] = useState(false);

  const [workspaces, setWorkspaces] = useState<ApiWorkspace[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [wsPopupOpen, setWsPopupOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#3b82f6');
  const [creating, setCreating] = useState(false);

  const workspaceId = params?.workspaceId as string | undefined;
  const currentWorkspace = workspaces.find((w) => w.id === workspaceId) ?? workspaces[0];

  /* Detect mobile */
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false); // start closed on mobile
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [setSidebarOpen]);

  useEffect(() => {
    setLoadingWorkspaces(true);
    workspacesApi.list().then(setWorkspaces).catch(() => setWorkspaces([])).finally(() => setLoadingWorkspaces(false));
  }, []);

  useEffect(() => {
    if (loadingWorkspaces) return;
    const nonWorkspaceRoutes = ['/inbox', '/settings', '/my-tasks', '/profile'];
    const isNonWorkspaceRoute = nonWorkspaceRoutes.some((r) => pathname.startsWith(r));
    if (isNonWorkspaceRoute || workspaceId || !workspaces.length) return;
    router.replace(`/workspace/${workspaces[0].id}`);
  }, [loadingWorkspaces, workspaceId, workspaces, router, pathname]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    setLoadingProjects(true);
    projectsApi.listByWorkspace(currentWorkspace.id).then(setProjects).catch(() => setProjects([])).finally(() => setLoadingProjects(false));
  }, [currentWorkspace?.id]);

  /* Close sidebar on mobile nav */
  const handleNavClick = () => { if (isMobile) setSidebarOpen(false); };

  const calendarHref = currentWorkspace ? `/workspace/${currentWorkspace.id}/calendar` : '#';

  const navItems: { href: string; icon: ReactNode; label: string; isActive: boolean; disabled?: boolean }[] = [
    { href: '/my-tasks', icon: <CheckSquare size={14} />, label: 'My Tasks', isActive: pathname === '/my-tasks' },
    { href: calendarHref, icon: <Calendar size={14} />, label: 'Calendar', isActive: pathname.includes('/calendar'), disabled: !currentWorkspace },
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
      setWorkspaces((p) => [...p, ws]);
      setNewWorkspaceName('');
      setShowNewWorkspace(false);
      router.push(`/workspace/${ws.id}`);
      toast.success('Workspace created.');
    } catch { toast.error('Failed to create workspace'); }
    finally { setCreating(false); }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !currentWorkspace) return;
    setCreating(true);
    try {
      const proj = await projectsApi.create({ workspaceId: currentWorkspace.id, name: newProjectName.trim(), color: newProjectColor });
      setProjects((p) => [...p, proj]);
      setNewProjectName('');
      setShowNewProject(false);
      router.push(`/workspace/${currentWorkspace.id}/project/${proj.id}`);
      toast.success('Project created.');
    } catch { toast.error('Failed to create project'); }
    finally { setCreating(false); }
  };

  const wsLetter = currentWorkspace?.name?.[0]?.toUpperCase() ?? 'T';

  return (
    <>
      {/* ── Mobile hamburger button ── */}
      {isMobile && !sidebarOpen && (
        <button className="sb-hamburger" onClick={toggleSidebar} aria-label="Open menu">
          <Menu size={18} />
        </button>
      )}

      {/* ── Mobile overlay tap-to-close ── */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            className="sidebar-mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <nav className={`sidebar${!sidebarOpen ? ' collapsed' : ''}`} style={{ overflow: 'hidden' }}>
        {/* Desktop collapse toggle removed — topbar toggle controls sidebar */}

        {/* Mobile close button */}
        {isMobile && sidebarOpen && (
          <button
            className="sb-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={14} />
          </button>
        )}

        {/* ── Workspace Header + Switcher ── */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            className="sb-workspace"
            onClick={() => {
              if (!sidebarOpen && !isMobile) { toggleSidebar(); return; }
              setWsPopupOpen((v) => !v);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="sb-ws-logo">{wsLetter}</div>
            {sidebarOpen && (
              <>
                <div className="sb-ws-info">
                  <span className="sb-ws-name">{currentWorkspace?.name ?? (loadingWorkspaces ? '...' : 'No workspace')}</span>
                  <span className="sb-ws-sub">{loadingWorkspaces ? 'Loading...' : `${workspaces.length} workspace${workspaces.length !== 1 ? 's' : ''}`}</span>
                </div>
                <button
                  className="sb-icon-btn"
                  title="Add workspace"
                  onClick={(e) => { e.stopPropagation(); setShowNewWorkspace(true); setWsPopupOpen(false); }}
                  style={{ marginLeft: 'auto' }}
                >
                  <Plus size={13} />
                </button>
              </>
            )}
          </div>

          {/* Workspace popup dropdown */}
          <AnimatePresence>
            {wsPopupOpen && sidebarOpen && (
              <motion.div
                className="ws-popup"
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <div className="ws-popup-header">Workspaces</div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    className={`ws-popup-item${ws.id === currentWorkspace?.id ? ' active' : ''}`}
                    onClick={() => { setWsPopupOpen(false); router.push(`/workspace/${ws.id}`); }}
                  >
                    <span className="ws-popup-logo">{ws.name[0]?.toUpperCase()}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</span>
                    {ws.id === currentWorkspace?.id && <span className="ws-popup-active-dot" />}
                  </button>
                ))}
                <button
                  className="ws-popup-add"
                  onClick={() => { setWsPopupOpen(false); setShowNewWorkspace(true); }}
                >
                  <Plus size={11} /> New Workspace
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* ── Nav Items ── */}
        <div className="sb-section">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`sidebar-nav-item${item.isActive ? ' active' : ''}${item.disabled ? ' disabled' : ''}`}
              aria-disabled={item.disabled}
              onClick={(e) => { if (item.disabled) e.preventDefault(); handleNavClick(); }}
            >
              <span className="sb-nav-icon">{item.icon}</span>
              {sidebarOpen && <span style={{ flex: 1 }}>{item.label}</span>}
            </Link>
          ))}
        </div>

        {/* ── Projects ── */}
        <div className="sb-projects">
          {sidebarOpen && (
            <div className="sb-section-hdr">
              <span className="sb-section-label">Projects</span>
              <button
                className="sb-icon-btn"
                title="New project"
                onClick={() => setShowNewProject(true)}
                disabled={!currentWorkspace}
              >
                <Plus size={12} />
              </button>
            </div>
          )}
          <div className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
            {loadingProjects ? (
              <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[80, 60, 70].map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px' }}>
                    <div className="skeleton" style={{ width: 8, height: 8, flexShrink: 0 }} />
                    <div className="skeleton" style={{ height: 11, width: `${w}%` }} />
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              sidebarOpen && (
                <div className="sb-empty">
                  No projects yet
                  {currentWorkspace && (
                    <button className="sb-empty-cta" onClick={() => setShowNewProject(true)}>
                      + Create first project
                    </button>
                  )}
                </div>
              )
            ) : (
              projects.map((project) => {
                const isActive = pathname.includes(project.id);
                return (
                  <Link
                    key={project.id}
                    href={`/workspace/${currentWorkspace?.id}/project/${project.id}`}
                    className={`sidebar-nav-item${isActive ? ' active' : ''}`}
                    onClick={handleNavClick}
                    style={{ fontSize: 12.5 }}
                  >
                    <span className="sb-project-dot" style={{ background: project.color ?? 'var(--accent)' }} />
                    {sidebarOpen && (
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.name}
                      </span>
                    )}
                  </Link>
                );
              })
            )}

            {sidebarOpen && projects.length > 0 && (
              <button
                className="sb-add-project-btn"
                onClick={() => setShowNewProject(true)}
                disabled={!currentWorkspace}
              >
                <Plus size={11} /> <span>New Project</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Settings ── */}
        <div className="sb-settings-row">
          <Link
            href="/settings"
            className={`sidebar-nav-item${pathname === '/settings' ? ' active' : ''}`}
            onClick={handleNavClick}
          >
            <span className="sb-nav-icon"><Settings size={14} /></span>
            {sidebarOpen && <span>Settings</span>}
          </Link>
        </div>

        {/* ── User Footer ── */}
        <div className="sb-user">
          <div className="sb-user-avatar">
            {user ? getInitials((user as any)?.full_name || (user as any)?.name || user.email || 'U') : 'U'}
          </div>
          {sidebarOpen && (
            <>
              <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                <div className="sb-user-name">
                  {(user as any)?.full_name || (user as any)?.name || 'User'}
                </div>
                <div className="sb-user-email">{user?.email || ''}</div>
              </div>
              <button className="sb-icon-btn" onClick={handleLogout} title="Sign out">
                <LogOut size={13} />
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showNewWorkspace && (
          <Modal title="New Workspace" onClose={() => setShowNewWorkspace(false)}>
            <input autoFocus className="input" placeholder="Workspace name e.g. Acme Corp" value={newWorkspaceName} onChange={(e) => setNewWorkspaceName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()} />
            <ModalActions onCancel={() => setShowNewWorkspace(false)} onConfirm={handleCreateWorkspace} loading={creating} disabled={!newWorkspaceName.trim()} label="Create" />
          </Modal>
        )}
        {showNewProject && (
          <Modal title="New Project" onClose={() => setShowNewProject(false)}>
            <input autoFocus className="input" placeholder="Project name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()} />
            <div style={{ marginTop: 14 }}>
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {['#3b82f6','#6366f1','#f97316','#22c55e','#ec4899','#06b6d4','#f59e0b','#ef4444'].map((c) => (
                  <button key={c} onClick={() => setNewProjectColor(c)} style={{ width: 22, height: 22, background: c, border: newProjectColor === c ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', outline: newProjectColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2, transform: newProjectColor === c ? 'scale(1.15)' : 'scale(1)', transition: '0.15s', flexShrink: 0 }} />
                ))}
              </div>
            </div>
            <ModalActions onCancel={() => setShowNewProject(false)} onConfirm={handleCreateProject} loading={creating} disabled={!newProjectName.trim()} label="Create" />
          </Modal>
        )}
      </AnimatePresence>

      <style jsx global>{`
        /* Mobile hamburger button */
        .sb-hamburger {
          position: fixed; top: 10px; left: 12px; z-index: 201;
          width: 36px; height: 36px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-primary); cursor: pointer;
        }
        .sb-hamburger:hover { background: var(--bg-elevated); }

        /* Close button inside sidebar on mobile */
        .sb-close-btn {
          position: absolute; top: 10px; right: 10px;
          width: 28px; height: 28px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-muted); cursor: pointer; z-index: 100;
        }
        .sb-close-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

        /* Workspace section */
        .sb-workspace {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 12px 12px;
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0; user-select: none;
          min-height: 58px;
        }

        .sb-ws-logo {
          width: 30px; height: 30px;
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; color: white; flex-shrink: 0;
          box-shadow: 0 2px 12px rgba(59,130,246,0.35);
          font-family: var(--font-display);
        }
        .sb-ws-info { flex: 1; overflow: hidden; }
        .sb-ws-name {
          display: block; font-size: 12.5px; font-weight: 700;
          color: var(--text-primary); overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap;
          line-height: 1.3; letter-spacing: -0.01em;
        }
        .sb-ws-sub {
          display: block; font-size: 9px; color: var(--text-muted);
          font-family: var(--font-mono); margin-top: 1px;
          text-transform: uppercase; letter-spacing: 0.08em;
        }

        /* Nav sections */
        .sb-section { padding: 6px 0; border-bottom: 1px solid var(--border-subtle); flex-shrink: 0; }
        .sb-nav-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: inherit; width: 16px; }

        /* Projects section */
        .sb-projects {
          flex: 1; overflow: hidden; display: flex; flex-direction: column;
          border-bottom: 1px solid var(--border-subtle);
          min-height: 0;
        }
        .sb-section-hdr {
          display: flex; align-items: center; justify-content: space-between;
          padding: 4px 8px 2px 12px; min-height: 32px; flex-shrink: 0;
        }
        .sb-section-label {
          font-size: 9px; font-weight: 700; font-family: var(--font-mono);
          color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em;
        }

        /* Empty state */
        .sb-empty {
          padding: 10px 16px; font-size: 11px; color: var(--text-muted);
          line-height: 1.5; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.04em;
          display: flex; flex-direction: column; gap: 6px;
        }
        .sb-empty-cta {
          font-size: 10px; font-weight: 700; color: var(--accent); background: none;
          border: none; cursor: pointer; padding: 0; font-family: var(--font-mono);
          text-transform: uppercase; letter-spacing: 0.06em; text-align: left;
        }

        /* Project dot */
        .sb-project-dot { width: 7px; height: 7px; flex-shrink: 0; }

        /* Add project button */
        .sb-add-project-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px 7px 16px;
          font-size: 11px; font-weight: 600; color: var(--text-muted);
          background: transparent; border: none; cursor: pointer;
          transition: all var(--transition); width: 100%;
          font-family: var(--font-display);
        }
        .sb-add-project-btn:hover { color: var(--accent); background: var(--accent-soft); }
        .sb-add-project-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        /* Icon button */
        .sb-icon-btn {
          width: 24px; height: 24px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: none;
          color: var(--text-muted); cursor: pointer;
          transition: all var(--transition); flex-shrink: 0;
        }
        .sb-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
        .sb-icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        /* Workspace popup */
        .ws-popup {
          position: absolute;
          top: calc(100% + 4px); left: 8px; right: 8px;
          z-index: 300;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          box-shadow: var(--shadow-lg);
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .ws-popup-header {
          font-size: 9px; font-weight: 700;
          color: var(--text-muted); text-transform: uppercase;
          letter-spacing: 0.1em; padding: 8px 12px 6px;
          border-bottom: 1px solid var(--border-subtle);
          font-family: var(--font-mono);
        }
        .ws-popup-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px;
          background: none; border: none; cursor: pointer;
          width: 100%; text-align: left;
          font-family: var(--font-display);
          font-size: 12.5px; font-weight: 600;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-subtle);
          transition: all var(--transition);
        }
        .ws-popup-item:hover { background: var(--bg-elevated); color: var(--text-primary); }
        .ws-popup-item.active { color: var(--accent); background: var(--accent-light); }
        .ws-popup-logo {
          width: 22px; height: 22px; flex-shrink: 0;
          background: var(--accent);
          color: white; font-size: 10px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }
        .ws-popup-active-dot {
          width: 6px; height: 6px; flex-shrink: 0;
          background: var(--accent);
          border-radius: 50%;
        }
        .ws-popup-add {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 12px;
          background: none; border: none; cursor: pointer;
          width: 100%; text-align: left;
          font-family: var(--font-mono);
          font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--accent);
          transition: background var(--transition);
        }
        .ws-popup-add:hover { background: var(--accent-light); }

        /* Settings + user rows */
        .sb-settings-row { padding: 6px 0; border-bottom: 1px solid var(--border-subtle); flex-shrink: 0; }
        .sb-user {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px; flex-shrink: 0;
          background: var(--bg-elevated);
          border-top: 1px solid var(--border-subtle);
        }
        .sb-user-avatar {
          width: 28px; height: 28px; flex-shrink: 0;
          background: var(--accent-soft); color: var(--accent);
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; font-family: var(--font-mono);
          border: 1px solid rgba(59,130,246,0.2);
        }
        .sb-user-name {
          font-size: 12px; font-weight: 700; color: var(--text-primary);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          line-height: 1.3; letter-spacing: -0.01em;
        }
        .sb-user-email {
          font-size: 10px; color: var(--text-muted); overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap; margin-top: 1px;
          font-family: var(--font-mono); letter-spacing: 0.02em;
        }
      `}</style>
    </>
  );
}

/* ── Modal helpers ────────────────────────────────────────────────────────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: 24, width: 380, maxWidth: '90vw', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '-0.01em', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ width: 28, height: 28, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Close"><X size={14} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
      </motion.div>
    </motion.div>
  );
}

function ModalActions({ onCancel, onConfirm, loading, disabled, label }: { onCancel: () => void; onConfirm: () => void; loading: boolean; disabled: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
      <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      <button className="btn btn-primary btn-sm" onClick={onConfirm} disabled={loading || disabled}>
        {loading ? 'Creating...' : label}
      </button>
    </div>
  );
}