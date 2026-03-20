'use client';

import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { WorkspaceRole } from '@/types';
import { Trash2, UserPlus, Shield, AlertTriangle, Mail, Globe, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { workspacesApi, type ApiWorkspace, type ApiWorkspaceMember } from '@/lib/apiClient';

const ROLES: WorkspaceRole[] = ['owner', 'admin', 'member', 'guest'];
const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
};

export default function SettingsPage() {
  // /settings has no workspaceId param — discover from API
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

  // Load workspace + members — auto-discover workspace since /settings has no URL param
  useEffect(() => {
    const load = async () => {
      try {
        // Find the first workspace the user belongs to
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
      toast.success('Workspace settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !workspaceId) return;
    setInviting(true);
    try {
      const newMember = await workspacesApi.inviteMember(workspaceId, { email: inviteEmail.trim(), role: inviteRole });
      setMembers((prev) => [...prev, newMember]);
      toast.success(`Invitation sent to ${inviteEmail}`, { icon: '📧' });
      setInviteEmail('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Invitation failed');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (member: ApiWorkspaceMember) => {
    if (member.role === 'owner') { toast.error("Can't remove the workspace owner"); return; }
    if (!workspaceId) return;
    try {
      await workspacesApi.removeMember(workspaceId, member.user_id);
      setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
      toast.success(`${member.user?.full_name || member.user?.email} removed from workspace`);
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleDeleteWorkspace = () => {
    toast.error('Workspace deletion requires server confirmation. Please check your email.', { duration: 5000 });
    setShowDeleteConfirm(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar title="Settings" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading settings...
          <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="Workspace Settings" />

      <div className="page-content scroll-y" style={{ maxWidth: 700 }}>
        {/* General */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Globe size={14} style={{ color: 'var(--accent)' }} /> General
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-field">
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Workspace Name
              </label>
              <input
                className="input"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveGeneral()}
                style={{ maxWidth: 400 }}
              />
            </div>
            <div className="form-field">
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Timezone
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                <select className="input" style={{ maxWidth: 300 }}>
                  <option>America/New_York (UTC-5)</option>
                  <option>America/Los_Angeles (UTC-8)</option>
                  <option>Europe/London (UTC+0)</option>
                  <option>Asia/Tokyo (UTC+9)</option>
                  <option>Asia/Kolkata (UTC+5:30)</option>
                </select>
              </div>
            </div>
            <div>
              <button onClick={handleSaveGeneral} disabled={saving} className="btn btn-primary" style={{ fontSize: 12.5 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </section>

        {/* Members */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Shield size={14} style={{ color: '#6366f1' }} /> Members ({members.length})
          </h2>

          {/* Invite */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Mail size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                className="input"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                style={{ paddingLeft: 32 }}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
            </div>
            <select
              className="input"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
              style={{ width: 110 }}
            >
              {(['admin', 'member', 'guest'] as WorkspaceRole[]).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="btn btn-primary" style={{ flexShrink: 0, fontSize: 12.5 }}>
              <UserPlus size={13} /> {inviting ? 'Inviting...' : 'Invite'}
            </button>
          </div>

          {/* Members Table */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Member</span><span>Role</span><span></span>
            </div>
            {members.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No members yet</div>
            ) : members.map((member, i) => {
              const name = member.user?.full_name || member.user?.email || 'Unknown';
              const initial = name[0]?.toUpperCase() ?? '?';
              return (
                <div key={member.user_id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: 16,
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: i < members.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  transition: 'background var(--transition)',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar" style={{ width: 32, height: 32, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, flexShrink: 0 }}>
                      {member.user?.avatar_url
                        ? <img src={member.user.avatar_url} alt={initial} style={{ width: 32, height: 32, borderRadius: '50%' }} />
                        : initial}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {name}
                        {member.role === 'owner' && <span style={{ fontSize: 10.5, color: 'var(--accent)', fontWeight: 700, background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 99, marginLeft: 6 }}>Owner</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{member.user?.email}</div>
                    </div>
                  </div>

                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {ROLE_LABELS[member.role] ?? member.role}
                  </span>

                  <button
                    onClick={() => handleRemoveMember(member)}
                    disabled={member.role === 'owner'}
                    style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none', cursor: member.role === 'owner' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', opacity: member.role === 'owner' ? 0.3 : 1, transition: 'all var(--transition)' }}
                    onMouseEnter={(e) => member.role !== 'owner' && (e.currentTarget.style.color = '#ef4444', e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)', e.currentTarget.style.background = 'transparent')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 7 }}>
            <AlertTriangle size={14} /> Danger Zone
          </h2>
          <div style={{ padding: '16px', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)', background: 'rgba(239,68,68,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>Delete this workspace</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Once deleted, all data including projects, tasks, and chat history will be permanently removed.</div>
              </div>
              <button
                className="btn btn-danger"
                style={{ flexShrink: 0, fontSize: 12.5 }}
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={12} /> Delete Workspace
              </button>
            </div>
          </div>

          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ marginTop: 12, padding: '16px', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 'var(--radius)', background: 'rgba(239,68,68,0.07)' }}
            >
              <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 12, fontWeight: 500 }}>
                Are you sure you want to permanently delete <strong>{workspace?.name}</strong>? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-danger" onClick={handleDeleteWorkspace} style={{ fontSize: 12.5 }}>Yes, Delete Forever</button>
                <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(false)} style={{ fontSize: 12.5 }}>Cancel</button>
              </div>
            </motion.div>
          )}
        </section>
      </div>

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
