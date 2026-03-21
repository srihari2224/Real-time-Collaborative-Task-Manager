'use client';

import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar } from '@/components/ui/Avatar';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { formatDate, isOverdue, isDueToday, isDueThisWeek } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { workspacesApi, projectsApi, tasksApi, type ApiTask } from '@/lib/apiClient';
import { MessageSquare, Calendar, CheckSquare, AlertTriangle, Loader2 } from 'lucide-react';

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

export default function MyTasksPage() {
  const { openTaskPanel } = useUIStore();
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const currentUserId = (user as any)?.id ?? '';

  useEffect(() => {
    if (!currentUserId) { setLoading(false); return; }

    const loadMyTasks = async () => {
      setLoading(true);
      try {
        // Load all workspaces → all projects → all tasks assigned to me
        const workspaces = await workspacesApi.list();
        const projectArrays = await Promise.all(
          workspaces.map((ws) => projectsApi.listByWorkspace(ws.id).catch(() => []))
        );
        const allProjects = projectArrays.flat();
        const taskArrays = await Promise.all(
          allProjects.map((p) => tasksApi.listByProject(p.id).catch(() => []))
        );
        const allTasks = taskArrays.flat();
        // Filter to tasks assigned to current user
        const mine = allTasks.filter((t) =>
          (t.assignees ?? []).some((a) => a.id === currentUserId)
        );
        setTasks(mine);
      } catch {
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadMyTasks();
  }, [currentUserId]);

  const activeTasks = tasks.filter((t) => !completedIds.has(t.id) && t.status !== 'done');
  const overdue = activeTasks.filter((t) => isOverdue(t.due_date ?? undefined));
  const dueToday = activeTasks.filter((t) => isDueToday(t.due_date ?? undefined) && !isOverdue(t.due_date ?? undefined));
  const thisWeek = activeTasks.filter((t) => isDueThisWeek(t.due_date ?? undefined) && !isOverdue(t.due_date ?? undefined) && !isDueToday(t.due_date ?? undefined));
  const noDueDate = activeTasks.filter((t) => !t.due_date);

  const sections = [
    { key: 'overdue', label: 'Overdue', color: '#ef4444', tasks: overdue },
    { key: 'today', label: 'Due Today', color: 'var(--accent)', tasks: dueToday },
    { key: 'week', label: 'Due This Week', color: '#6366f1', tasks: thisWeek },
    { key: 'none', label: 'No Due Date', color: 'var(--text-muted)', tasks: noDueDate },
  ].filter((s) => s.tasks.length > 0);

  const toggleComplete = async (taskId: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
    // Optimistically mark done in backend
    try {
      const isNowDone = !completedIds.has(taskId);
      await tasksApi.update(taskId, { status: isNowDone ? 'done' : 'todo' });
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar title="My Tasks" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading your tasks...
          <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="My Tasks" />

      <div className="page-content scroll-y">
        {sections.map((section) => (
          <div key={section.key} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              {section.key === 'overdue' && <AlertTriangle size={14} style={{ color: '#ef4444' }} />}
              {section.key === 'today' && <Calendar size={14} style={{ color: 'var(--accent)' }} />}
              <h2 style={{ fontSize: 13, fontWeight: 700, color: section.color }}>{section.label}</h2>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: 99, padding: '1px 7px', border: '1px solid var(--border-subtle)' }}>
                {section.tasks.length}
              </span>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {section.tasks.map((task, i) => {
                const isComplete = completedIds.has(task.id);
                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                      borderBottom: i < section.tasks.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      transition: 'background var(--transition)', opacity: isComplete ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleComplete(task.id)}
                      style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${isComplete ? 'var(--accent)' : 'var(--border-strong)'}`, background: isComplete ? 'var(--accent)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all var(--transition)' }}
                    >
                      {isComplete && <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>✓</span>}
                    </button>

                    <span
                      onClick={() => openTaskPanel(task.id)}
                      style={{ flex: 1, fontSize: 13, fontWeight: 500, cursor: 'pointer', textDecoration: isComplete ? 'line-through' : 'none', color: isComplete ? 'var(--text-muted)' : 'var(--text-primary)' }}
                    >
                      {task.title}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <PriorityBadge priority={task.priority as any} showLabel={false} />
                      {task.due_date && (
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: isOverdue(task.due_date ?? undefined) ? '#ef4444' : 'var(--text-muted)' }}>
                          {formatDate(task.due_date)}
                        </span>
                      )}
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {tasks.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
            <CheckSquare size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>All caught up!</h3>
            <p style={{ fontSize: 13 }}>No tasks assigned to you.</p>
          </div>
        )}
      </div>

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
