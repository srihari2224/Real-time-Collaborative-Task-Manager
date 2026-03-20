'use client';

import { TopBar } from '@/components/layout/TopBar';
import { WORKSPACE, USERS, TASKS, NOTIFICATIONS, PROJECTS } from '@/data/seed';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeTime, isOverdue } from '@/lib/utils';
import { Activity, CheckCircle2, MessageSquare, UserPlus, Calendar, TrendingUp } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import Link from 'next/link';

const FEED_ITEMS = [
  { id: '1', type: 'task_created', user: USERS[0], text: 'created task', target: 'Redesign homepage hero section', time: '2026-03-19T11:00:00Z', projectId: 'p1' },
  { id: '2', type: 'chat_message', user: USERS[2], text: 'sent a message in', target: 'Redesign homepage hero section', time: '2026-03-19T11:30:00Z', projectId: 'p1' },
  { id: '3', type: 'task_moved', user: USERS[3], text: 'moved task to In Review', target: 'Create contact form', time: '2026-03-18T16:30:00Z', projectId: 'p1' },
  { id: '4', type: 'member_joined', user: USERS[4], text: 'joined the workspace', target: '', time: '2026-03-18T10:00:00Z', projectId: '' },
  { id: '5', type: 'task_completed', user: USERS[0], text: 'completed', target: 'SEO meta tags and sitemap', time: '2026-03-17T15:00:00Z', projectId: 'p1' },
];

const FEED_ICONS: Record<string, React.ReactNode> = {
  task_created: <CheckCircle2 size={14} style={{ color: '#22c55e' }} />,
  chat_message: <MessageSquare size={14} style={{ color: 'var(--accent)' }} />,
  task_moved: <TrendingUp size={14} style={{ color: '#6366f1' }} />,
  member_joined: <UserPlus size={14} style={{ color: '#f59e0b' }} />,
  task_completed: <CheckCircle2 size={14} style={{ color: '#22c55e' }} />,
};

export default function WorkspaceHomePage() {
  const { openTaskPanel } = useUIStore();
  const unreadNotifications = NOTIFICATIONS.filter((n) => !n.is_read);

  const overdueTasks = TASKS.filter((t) => isOverdue(t.due_date));
  const totalTasks = TASKS.length;
  const completedTasks = TASKS.filter((t) =>
    t.subtasks.length > 0 && t.subtasks.every((s) => s.is_completed)
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title={WORKSPACE.name} />

      <div className="page-content scroll-y">
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total Tasks', value: totalTasks, icon: <CheckCircle2 size={16} />, color: '#6366f1' },
            { label: 'Overdue', value: overdueTasks.length, icon: <Calendar size={16} />, color: '#ef4444' },
            { label: 'Team Members', value: USERS.length, icon: <UserPlus size={16} />, color: '#22c55e' },
            { label: 'Notifications', value: unreadNotifications.length, icon: <MessageSquare size={16} />, color: 'var(--accent)' },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</span>
                <span style={{ color: stat.color }}>{stat.icon}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
          {/* Activity Feed */}
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <Activity size={14} /> Activity Feed
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {FEED_ITEMS.map((item) => (
                <div key={item.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <Avatar user={item.user} size={30} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      <strong style={{ fontWeight: 600 }}>{item.user.name}</strong>
                      {' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{item.text}</span>
                      {' '}
                      {item.target && <strong style={{ fontWeight: 600, color: 'var(--text-primary)' }}>&ldquo;{item.target}&rdquo;</strong>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      {formatRelativeTime(item.time)}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>{FEED_ICONS[item.type]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar: Projects + Members */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Projects</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {PROJECTS.map((p) => (
                  <Link key={p.id} href={`/workspace/${WORKSPACE.id}/project/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', cursor: 'pointer', textDecoration: 'none', transition: 'all var(--transition)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Team</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {USERS.slice(0, 4).map((u) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)' }}>
                    <div style={{ position: 'relative' }}>
                      <Avatar user={u} size={28} showPresence />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
