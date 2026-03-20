'use client';

import { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { WORKSPACE, USERS } from '@/data/seed';
import { Avatar } from '@/components/ui/Avatar';
import { WorkspaceRole } from '@/types';
import { Trash2, UserPlus, Shield, AlertTriangle, Mail, Globe, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const ROLES: WorkspaceRole[] = ['owner', 'admin', 'member', 'guest'];
const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
};
const MEMBER_ROLES: WorkspaceRole[] = ['u1', 'u2', 'u3', 'u4', 'u5'].map((_, i) => ['owner', 'admin', 'member', 'member', 'guest'][i] as WorkspaceRole);

export default function SettingsPage() {
  const [workspaceName, setWorkspaceName] = useState(WORKSPACE.name);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member');
  const [roles, setRoles] = useState<WorkspaceRole[]>(MEMBER_ROLES);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveGeneral = () => toast.success('Workspace settings saved');
  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    toast.success(`Invitation sent to ${inviteEmail}`, { icon: '📧' });
    setInviteEmail('');
  };
  const handleRemoveMember = (idx: number) => {
    if (idx === 0) { toast.error("Can't remove the workspace owner"); return; }
    toast.success(`${USERS[idx].name} removed from workspace`);
  };
  const handleDeleteWorkspace = () => {
    toast.error('Workspace deletion requires server confirmation. Please check your email.', { duration: 5000 });
    setShowDeleteConfirm(false);
  };

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
              <button onClick={handleSaveGeneral} className="btn btn-primary" style={{ fontSize: 12.5 }}>
                Save Changes
              </button>
            </div>
          </div>
        </section>

        {/* Members */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Shield size={14} style={{ color: '#6366f1' }} /> Members ({USERS.length})
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
            <button onClick={handleInvite} className="btn btn-primary" style={{ flexShrink: 0, fontSize: 12.5 }}>
              <UserPlus size={13} /> Invite
            </button>
          </div>

          {/* Members Table */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Member</span><span>Role</span><span></span>
            </div>
            {USERS.map((user, i) => (
              <div key={user.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 16,
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: i < USERS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                transition: 'background var(--transition)',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar user={user} size={32} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user.name} {i === 0 && <span style={{ fontSize: 10.5, color: 'var(--accent)', fontWeight: 700, background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 99 }}>You</span>}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{user.email}</div>
                  </div>
                </div>

                <select
                  className="input"
                  value={roles[i]}
                  disabled={i === 0}
                  onChange={(e) => { const next = [...roles]; next[i] = e.target.value as WorkspaceRole; setRoles(next); toast.success(`${user.name}'s role updated`, { duration: 1500 }); }}
                  style={{ width: 100, fontSize: 12, padding: '4px 8px', opacity: i === 0 ? 0.6 : 1 }}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>

                <button
                  onClick={() => handleRemoveMember(i)}
                  disabled={i === 0}
                  style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none', cursor: i === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', opacity: i === 0 ? 0.3 : 1, transition: 'all var(--transition)' }}
                  onMouseEnter={(e) => i !== 0 && (e.currentTarget.style.color = '#ef4444', e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)', e.currentTarget.style.background = 'transparent')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
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

          {/* Confirm Dialog */}
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ marginTop: 12, padding: '16px', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 'var(--radius)', background: 'rgba(239,68,68,0.07)' }}
            >
              <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 12, fontWeight: 500 }}>
                Are you sure you want to permanently delete <strong>{WORKSPACE.name}</strong>? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-danger" onClick={handleDeleteWorkspace} style={{ fontSize: 12.5 }}>Yes, Delete Forever</button>
                <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(false)} style={{ fontSize: 12.5 }}>Cancel</button>
              </div>
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}
