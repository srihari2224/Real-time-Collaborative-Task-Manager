'use client';

import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { formatRelativeTime } from '@/lib/utils';
import { notificationsApi, type ApiNotification } from '@/lib/apiClient';
import { Bell, MessageSquare, UserCheck, AlertTriangle, CheckCircle2, Activity, CheckCheck, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  task_assigned:      <UserCheck size={14} style={{ color: '#22c55e' }} />,
  mention_description:<Bell size={14} style={{ color: '#6366f1' }} />,
  mention_chat:       <MessageSquare size={14} style={{ color: 'var(--accent)' }} />,
  chat_message:       <MessageSquare size={14} style={{ color: 'var(--accent)' }} />,
  task_overdue:       <AlertTriangle size={14} style={{ color: '#ef4444' }} />,
  status_changed:     <Activity size={14} style={{ color: '#f59e0b' }} />,
};

export default function InboxPage() {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsApi.list()
      .then(({ notifications }) => setNotifications(notifications))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await notificationsApi.markAllRead().catch(() => {});
  };

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await notificationsApi.markRead(id).catch(() => {});
  };

  const unread = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar title="Inbox" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading notifications...
          <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar
        title="Inbox"
        actions={
          unread > 0 ? (
            <button onClick={markAllRead} className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 10px' }}>
              <CheckCheck size={12} /> Mark all read
            </button>
          ) : undefined
        }
      />

      <div className="page-content scroll-y">
        {unread > 0 && (
          <div style={{ marginBottom: 16, padding: '8px 14px', background: 'var(--accent-soft)', border: '1px solid rgba(255,107,71,0.2)', borderRadius: 'var(--radius)', fontSize: 12.5, color: 'var(--accent)', fontWeight: 600 }}>
            {unread} unread notification{unread > 1 ? 's' : ''}
          </div>
        )}

        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>All clear!</h3>
            <p style={{ fontSize: 13 }}>No notifications yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <div
                  onClick={() => markRead(n.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '14px 16px',
                    background: n.is_read ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                    border: `1px solid ${n.is_read ? 'var(--border-subtle)' : 'var(--border-default)'}`,
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    transition: 'all var(--transition)',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = n.is_read ? 'var(--border-subtle)' : 'var(--border-default)')}
                >
                  {!n.is_read && (
                    <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, background: 'var(--accent)', borderRadius: '0 2px 2px 0' }} />
                  )}

                  <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bell size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      {TYPE_ICONS[n.type] ?? <Bell size={14} style={{ color: 'var(--text-muted)' }} />}
                      <span style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: 'var(--text-primary)' }}>
                        <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{n.message || n.type.replace(/_/g, ' ')}</span>
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      {formatRelativeTime(n.created_at)}
                    </div>
                  </div>

                  {!n.is_read && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 3 }} />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
