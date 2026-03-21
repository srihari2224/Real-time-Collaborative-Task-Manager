'use client';

import { useState, useEffect, CSSProperties } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { WorkspaceRole } from '@/types';
import {
  Trash2, UserPlus, Shield, AlertTriangle, Mail,
  Loader2, User, Settings, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { workspacesApi, type ApiWorkspace, type ApiWorkspaceMember } from '@/lib/apiClient';

const ROLES: WorkspaceRole[] = ['owner', 'admin', 'member', 'guest'];
const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner', admin: 'Admin', member: 'Member', guest: 'Guest',
};
const ROLE_COLORS: Record<WorkspaceRole, { color: string; bg: string }> = {
  owner: { color: '#d97706', bg: 'rgba(217,119,6,0.10)' },
  admin: { color: '#7c3aed', bg: 'rgba(124,58,237,0.10)' },
  member: { color: '#2563eb', bg: 'rgba(37,99,235,0.10)' },
  guest: { color: '#64748b', bg: 'rgba(100,116,139,0.10)' },
};

export default function SettingsPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<ApiWorkspace | null>(null);
  const [members, setMembers] = useState<ApiWorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);

  /* ── Data ── */
  useEffect(() => {
    const load = async () => {
      try {
        const workspaces = await workspacesApi.list();
        if (!workspaces.length) { setLoading(false); return; }
        const wsId = workspaces[0].id;
        setWorkspaceId(wsId);
        const [ws, mems] = await Promise.all([
          workspacesApi.get(wsId),
          workspacesApi.getMembers(wsId),
        ]);
        setWorkspace(ws);
        setWorkspaceName(ws.name);
        setMembers(mems);
      } catch {
        toast.error('Failed to load workspace settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSaveGeneral = async () => {
    if (!workspaceId || !workspaceName.trim()) return;
    setSaving(true);
    try {
      const updated = await workspacesApi.update(workspaceId, { name: workspaceName.trim() });
      setWorkspace(updated);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !workspaceId) return;
    setInviting(true);
    try {
      const newMember = await workspacesApi.inviteMember(workspaceId, { email: inviteEmail.trim(), role: inviteRole });
      setMembers((prev) => [...prev, newMember]);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Invitation failed');
    } finally { setInviting(false); }
  };

  const handleRemoveMember = async (member: ApiWorkspaceMember) => {
    if (member.role === 'owner') { toast.error("Can't remove the workspace owner"); return; }
    if (!workspaceId) return;
    try {
      await workspacesApi.removeMember(workspaceId, member.user_id);
      setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
      toast.success(`${member.user?.full_name || member.user?.email} removed`);
    } catch { toast.error('Failed to remove member'); }
  };

  const handleDeleteWorkspace = () => {
    toast.error('Workspace deletion requires email confirmation.', { duration: 5000 });
    setShowDeleteConfirm(false);
  };

  /* ── Loading ── */
  if (loading) return (
    <>
      <style>{CSS}</style>
      <div className="st-root">
        <TopBar title="Settings" />
        <div className="st-loader">
          <Loader2 size={20} className="st-spin" />
          <span>Loading settings…</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="st-root">

        <TopBar title="Workspace Settings" />

        <div className="st-body">
          <div className="st-content">

            {/* ── Section: Workspace Name ── */}
            <section className="st-section">
              <div className="st-fields" style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                {/* Workspace name */}
                <div className="st-field" style={{ flex: 1 }}>
                  <label className="st-label" htmlFor="ws-name-input">Workspace Name</label>
                  <input
                    id="ws-name-input"
                    className="st-input"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveGeneral()}
                    placeholder="My Workspace"
                    maxLength={80}
                  />
                </div>

                <button
                  type="button"
                  className="st-save-btn"
                  onClick={handleSaveGeneral}
                  disabled={saving}
                  style={{ alignSelf: 'auto', marginBottom: '2px', height: '43px' }}
                >
                  {saving ? <><span className="st-spin-sm" />Saving…</> : 'Save Changes'}
                </button>
              </div>
            </section>

            {/* ── Section: Members ── */}
            <section className="st-section">
              <div className="st-section-header">
                <Shield size={14} style={{ color: '#7c3aed' } as CSSProperties} />
                <span>Members <span className="st-badge-count">{members.length}</span></span>
              </div>

              {/* Invite row */}
              <div className="st-invite-row">
                <div className="st-input-wrap">
                  <Mail size={14} className="st-input-icon" />
                  <input
                    className="st-input has-icon"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    type="email"
                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  />
                </div>
                <select
                  className="st-select"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                >
                  {(['admin', 'member', 'guest'] as WorkspaceRole[]).map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="st-invite-btn"
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                >
                  {inviting
                    ? <Loader2 size={14} className="st-spin" />
                    : <><UserPlus size={13} />Invite</>
                  }
                </button>
              </div>

              {/* Members table */}
              <div className="st-members-table">
                <div className="st-table-header">
                  <span>Member</span>
                  <span>Role</span>
                  <span></span>
                </div>
                {members.length === 0 ? (
                  <div className="st-table-empty">No members yet</div>
                ) : members.map((m, i) => {
                  const name = m.user?.full_name || m.user?.email || 'Unknown';
                  const initial = name[0]?.toUpperCase() ?? '?';
                  const roleStyle = ROLE_COLORS[m.role] ?? ROLE_COLORS.member;
                  return (
                    <div key={m.user_id} className={`st-member-row${i === members.length - 1 ? ' last' : ''}`}>
                      <div className="st-member-info">
                        <div className="st-avatar">
                          {m.user?.avatar_url
                            ? <img src={m.user.avatar_url} alt={initial} />
                            : initial}
                        </div>
                        <div className="st-member-text">
                          <span className="st-member-name">{name}</span>
                          <span className="st-member-email">{m.user?.email}</span>
                        </div>
                      </div>
                      <span
                        className="st-role-badge"
                        style={{ color: roleStyle.color, background: roleStyle.bg } as CSSProperties}
                      >
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                      <button
                        type="button"
                        className="st-remove-btn"
                        onClick={() => handleRemoveMember(m)}
                        disabled={m.role === 'owner'}
                        title={m.role === 'owner' ? 'Cannot remove owner' : 'Remove member'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Section: Danger Zone ── */}
            <section className="st-section danger">
              <div className="st-section-header danger-header">
                <AlertTriangle size={14} />
                <span>Danger Zone</span>
              </div>

              <div className="st-danger-box">
                <div className="st-danger-text">
                  <span className="st-danger-title">Delete this workspace</span>
                  <span className="st-danger-desc">
                    Once deleted, all data including projects, tasks, and chat history will be permanently removed.
                  </span>
                </div>
                <button
                  type="button"
                  className="st-delete-btn"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={12} /> Delete Workspace
                </button>
              </div>

              <AnimatePresence>
                {showDeleteConfirm && (
                  <motion.div
                    className="st-confirm-box"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <button
                      type="button"
                      className="st-confirm-close"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <X size={14} />
                    </button>
                    <p className="st-confirm-text">
                      Are you sure you want to permanently delete{' '}
                      <strong>{workspace?.name}</strong>? This cannot be undone.
                    </p>
                    <div className="st-confirm-actions">
                      <button type="button" className="st-delete-btn" onClick={handleDeleteWorkspace}>
                        Yes, Delete Forever
                      </button>
                      <button type="button" className="st-cancel-btn" onClick={() => setShowDeleteConfirm(false)}>
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.st-root {
  --st-font:    'Plus Jakarta Sans','Inter',sans-serif;
  --st-bg:      #f0f4f8;
  --st-surface: #ffffff;
  --st-elev:    #f7f9fc;
  --st-overlay: #eef2f7;
  --st-txt:     #0f172a;
  --st-txt2:    #475569;
  --st-muted:   #94a3b8;
  --st-border:  rgba(15,23,42,0.08);
  --st-border2: rgba(15,23,42,0.14);
  --st-border3: rgba(15,23,42,0.24);
  --st-accent:  #2563eb;
  --st-acc-soft:rgba(37,99,235,0.10);
  --st-radius:  10px;
  --st-radius-sm:6px;
  --st-shadow:  0 1px 4px rgba(15,23,42,0.10);
  --st-shadow-md:0 4px 16px rgba(15,23,42,0.10);
  --st-glow:    0 0 0 3px rgba(37,99,235,0.18);
  --st-t:       150ms cubic-bezier(.4,0,.2,1);

  display: flex; flex-direction: column;
  height: 100%; font-family: var(--st-font);
  background: var(--st-bg); color: var(--st-txt);
  position: relative;
}
html.dark .st-root {
  --st-bg:      #0b1120;
  --st-surface: #111827;
  --st-elev:    #1c2333;
  --st-overlay: #243049;
  --st-txt:     #f1f5f9;
  --st-txt2:    #94a3b8;
  --st-muted:   #64748b;
  --st-border:  rgba(255,255,255,0.06);
  --st-border2: rgba(255,255,255,0.12);
  --st-border3: rgba(255,255,255,0.22);
  --st-accent:  #3b82f6;
  --st-acc-soft:rgba(59,130,246,0.12);
  --st-shadow:  0 1px 4px rgba(0,0,0,0.40);
  --st-shadow-md:0 4px 16px rgba(0,0,0,0.36);
  --st-glow:    0 0 0 3px rgba(59,130,246,0.25);
}

/* Loader */
.st-loader {
  flex: 1; display: flex; align-items: center;
  justify-content: center; gap: 10px;
  font-size: 14px; color: var(--st-muted); font-family: var(--st-font);
}
.st-spin { animation: st-spin 1s linear infinite; }
@keyframes st-spin { to { transform: rotate(360deg); } }

/* Body */
.st-body {
  flex: 1; overflow-y: auto;
  padding: 28px 24px;
  background: var(--st-bg);
}
.st-content { max-width: 680px; display: flex; flex-direction: column; gap: 24px; }

/* Section */
.st-section {
  background: var(--st-surface);
  border: 1px solid var(--st-border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--st-shadow);
}
.st-section-header {
  display: flex; align-items: center; gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--st-border);
  font-size: 13px; font-weight: 700;
  color: var(--st-txt); letter-spacing: -0.01em;
  background: var(--st-elev);
}
.st-section.danger .st-section-header {
  color: #dc2626; background: rgba(220,38,38,0.04);
  border-color: rgba(220,38,38,0.15);
}
.st-badge-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px;
  padding: 0 6px;
  background: var(--st-acc-soft); color: var(--st-accent);
  border-radius: 99px; font-size: 11px; font-weight: 700;
}



/* Fields */
.st-fields {
  display: flex; flex-direction: column; gap: 18px;
  padding: 20px;
}
.st-field { display: flex; flex-direction: column; gap: 6px; }
.st-label {
  font-size: 11.5px; font-weight: 700;
  color: var(--st-txt2); text-transform: uppercase;
  letter-spacing: 0.07em;
}

/* Input */
.st-input {
  background: var(--st-elev);
  border: 1.5px solid var(--st-border2);
  border-radius: var(--st-radius-sm);
  color: var(--st-txt);
  font-family: var(--st-font);
  font-size: 14px; font-weight: 500;
  padding: 11px 13px;
  outline: none; width: 100%;
  transition: border-color var(--st-t), box-shadow var(--st-t);
  max-width: 420px;
  -webkit-appearance: none;
}
.st-input::placeholder { color: var(--st-muted); font-weight: 400; }
.st-input:focus { border-color: var(--st-accent); box-shadow: var(--st-glow); background: var(--st-surface); }
.st-input:hover:not(:focus) { border-color: var(--st-border3); }
.st-input.has-icon { padding-left: 38px; }

/* Input wrap */
.st-input-wrap { position: relative; display: flex; align-items: center; flex: 1; }
.st-input-icon { position: absolute; left: 12px; color: var(--st-muted); pointer-events: none; }
.st-input-wrap .st-input { max-width: 100%; }

/* Select */
.st-select {
  background: var(--st-elev);
  border: 1.5px solid var(--st-border2);
  border-radius: var(--st-radius-sm);
  color: var(--st-txt);
  font-family: var(--st-font);
  font-size: 13px; font-weight: 500;
  padding: 11px 28px 11px 12px;
  outline: none; cursor: pointer;
  transition: border-color var(--st-t);
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  width: 120px; flex-shrink: 0;
}
.st-select:focus { border-color: var(--st-accent); box-shadow: var(--st-glow); }

/* Save btn */
.st-save-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 20px;
  background: var(--st-accent); color: white;
  border: none; border-radius: var(--st-radius-sm);
  font-size: 13.5px; font-weight: 700;
  font-family: var(--st-font); cursor: pointer;
  transition: all var(--st-t); align-self: flex-start;
}
.st-save-btn:hover:not(:disabled) { background: #1d4ed8; box-shadow: 0 3px 12px rgba(37,99,235,0.32); transform: translateY(-1px); }
.st-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.st-spin-sm {
  width: 13px; height: 13px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white; border-radius: 50%;
  animation: st-spin 0.65s linear infinite;
}

/* Invite row */
.st-invite-row {
  display: flex; gap: 8px; padding: 16px 20px;
  border-bottom: 1px solid var(--st-border);
  flex-wrap: wrap;
}
.st-invite-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 16px;
  background: var(--st-accent); color: white;
  border: none; border-radius: var(--st-radius-sm);
  font-size: 13px; font-weight: 700;
  font-family: var(--st-font); cursor: pointer;
  transition: all var(--st-t); white-space: nowrap; flex-shrink: 0;
}
.st-invite-btn:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-1px); }
.st-invite-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Members table */
.st-members-table { display: flex; flex-direction: column; }
.st-table-header {
  display: grid; grid-template-columns: 1fr 100px 40px;
  gap: 12px; padding: 10px 20px;
  font-size: 10.5px; font-weight: 700;
  color: var(--st-muted); text-transform: uppercase; letter-spacing: 0.07em;
  background: var(--st-elev);
  border-bottom: 1px solid var(--st-border);
}
.st-table-empty {
  padding: 28px; text-align: center;
  font-size: 13.5px; color: var(--st-muted);
}
.st-member-row {
  display: grid; grid-template-columns: 1fr 100px 40px;
  gap: 12px; align-items: center;
  padding: 13px 20px;
  border-bottom: 1px solid var(--st-border);
  transition: background var(--st-t);
}
.st-member-row.last { border-bottom: none; }
.st-member-row:hover { background: var(--st-elev); }

.st-member-info { display: flex; align-items: center; gap: 10px; min-width: 0; }
.st-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--st-acc-soft); color: var(--st-accent);
  font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; overflow: hidden;
}
.st-avatar img { width: 100%; height: 100%; object-fit: cover; }
.st-member-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.st-member-name {
  font-size: 13.5px; font-weight: 600; color: var(--st-txt);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.st-member-email {
  font-size: 11.5px; color: var(--st-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.st-role-badge {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 99px;
  font-size: 11px; font-weight: 700;
  white-space: nowrap;
}
.st-remove-btn {
  width: 32px; height: 32px;
  border-radius: var(--st-radius-sm);
  background: transparent; border: none;
  color: var(--st-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all var(--st-t);
}
.st-remove-btn:hover:not(:disabled) { background: rgba(220,38,38,0.10); color: #dc2626; }
.st-remove-btn:disabled { opacity: 0.25; cursor: not-allowed; }

/* Danger section */
.st-danger-box {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(220,38,38,0.12);
  flex-wrap: wrap;
}
.st-danger-text { display: flex; flex-direction: column; gap: 4px; }
.st-danger-title { font-size: 13.5px; font-weight: 600; color: var(--st-txt); }
.st-danger-desc  { font-size: 12.5px; color: var(--st-muted); line-height: 1.5; max-width: 380px; }
.st-delete-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 16px;
  background: rgba(220,38,38,0.08); color: #dc2626;
  border: 1px solid rgba(220,38,38,0.28);
  border-radius: var(--st-radius-sm);
  font-size: 13px; font-weight: 700;
  font-family: var(--st-font); cursor: pointer;
  transition: all var(--st-t); white-space: nowrap; flex-shrink: 0;
}
.st-delete-btn:hover { background: rgba(220,38,38,0.15); border-color: rgba(220,38,38,0.45); }

.st-confirm-box {
  margin: 0; padding: 20px;
  background: rgba(220,38,38,0.05);
  border-top: 1px solid rgba(220,38,38,0.15);
  position: relative;
}
.st-confirm-close {
  position: absolute; top: 14px; right: 14px;
  background: transparent; border: none;
  color: var(--st-muted); cursor: pointer;
  display: flex;
}
.st-confirm-text {
  font-size: 13.5px; color: var(--st-txt);
  line-height: 1.55; margin-bottom: 16px;
}
.st-confirm-text strong { color: #dc2626; }
.st-confirm-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.st-cancel-btn {
  display: inline-flex; align-items: center;
  padding: 9px 16px;
  background: var(--st-elev);
  border: 1px solid var(--st-border2);
  border-radius: var(--st-radius-sm);
  font-size: 13px; font-weight: 600;
  color: var(--st-txt2);
  font-family: var(--st-font); cursor: pointer;
  transition: all var(--st-t);
}
.st-cancel-btn:hover { background: var(--st-overlay); border-color: var(--st-border3); }

/* Responsive */
@media (max-width: 640px) {
  .st-body { padding: 16px 12px; }
  .st-invite-row { gap: 8px; }
  .st-select { width: 100px; }
  .st-table-header,
  .st-member-row { grid-template-columns: 1fr 80px 36px; padding: 11px 14px; }
  .st-fields { padding: 16px 14px; }
  .st-section-header { padding: 13px 14px; }
  .st-input { max-width: 100%; font-size: 16px; }
  .st-danger-box { flex-direction: column; }
}
`;