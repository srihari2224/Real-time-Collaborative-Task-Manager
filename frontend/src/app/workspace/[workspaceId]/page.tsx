'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeTime, isOverdue } from '@/lib/utils';
import { Activity, CheckCircle2, MessageSquare, UserPlus, Calendar, TrendingUp, Loader2, Plus, FolderKanban } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import Link from 'next/link';
import { workspacesApi, projectsApi, tasksApi, type ApiWorkspace, type ApiProject, type ApiTask, type ApiWorkspaceMember } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';

export default function WorkspaceHomePage() {
  const params = useParams();
  const workspaceId = params?.workspaceId as string;
  const { openTaskPanel } = useUIStore();
  const { user } = useAuthStore();

  const [workspace, setWorkspace] = useState<ApiWorkspace | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [members, setMembers] = useState<ApiWorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);

    Promise.all([
      workspacesApi.get(workspaceId),
      workspacesApi.getMembers(workspaceId),
      projectsApi.listByWorkspace(workspaceId),
    ])
      .then(async ([ws, mems, projs]) => {
        setWorkspace(ws);
        setMembers(mems);
        setProjects(projs);
        // Load tasks for all projects
        const taskArrays = await Promise.all(projs.map((p) => tasksApi.listByProject(p.id).catch(() => [])));
        setTasks(taskArrays.flat());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const overdueTasks = tasks.filter((t) => isOverdue(t.due_date));
  const completedTasks = tasks.filter((t) => t.status === 'done');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar title="Loading..." />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title={workspace?.name ?? 'Workspace'} />

      <div className="page-content scroll-y">
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total Tasks', value: tasks.length, icon: <CheckCircle2 size={16} />, color: '#6366f1' },
            { label: 'In Progress', value: inProgressTasks.length, icon: <TrendingUp size={16} />, color: '#f59e0b' },
            { label: 'Overdue', value: overdueTasks.length, icon: <Calendar size={16} />, color: '#ef4444' },
            { label: 'Team Members', value: members.length, icon: <UserPlus size={16} />, color: '#22c55e' },
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
          {/* Recent Tasks */}
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <Activity size={14} /> Recent Tasks
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {tasks.length === 0 ? (
                <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No tasks yet. Create a project and add tasks to get started.
                </div>
              ) : (
                tasks.slice(0, 8).map((task) => (
                  <div
                    key={task.id}
                    className="card"
                    style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                    onClick={() => openTaskPanel(task.id)}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: task.priority === 'urgent' ? '#ef4444' : task.priority === 'high' ? '#f97316' : task.priority === 'medium' ? '#3b82f6' : '#6b7280'
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{task.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {task.status.replace('_', ' ')} · {task.due_date ? formatRelativeTime(task.due_date) : 'No due date'}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                      background: task.status === 'done' ? '#22c55e20' : task.status === 'in_progress' ? '#f59e0b20' : 'var(--bg-elevated)',
                      color: task.status === 'done' ? '#22c55e' : task.status === 'in_progress' ? '#f59e0b' : 'var(--text-muted)',
                      textTransform: 'capitalize',
                    }}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar: Projects + Members */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Projects
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <Plus size={12} /> New
                </button>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {projects.length === 0 ? (
                  <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No projects yet</div>
                ) : (
                  projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/workspace/${workspaceId}/project/${p.id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', cursor: 'pointer', textDecoration: 'none', transition: 'all var(--transition)' }}
                    >
                      <FolderKanban size={14} style={{ color: p.color ?? 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Team ({members.length})</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {members.slice(0, 5).map((m) => (
                  <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)' }}>
                    <div className="avatar" style={{ width: 28, height: 28, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 11, flexShrink: 0 }}>
                      {(m.user?.full_name || m.user?.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{m.user?.full_name || m.user?.email}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{m.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
