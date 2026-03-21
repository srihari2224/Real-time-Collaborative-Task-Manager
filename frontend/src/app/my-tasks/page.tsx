'use client';

import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { formatDate, isOverdue, PRIORITY_CONFIG } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { workspacesApi, projectsApi, tasksApi, type ApiTask } from '@/lib/apiClient';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';
import { CheckSquare, Loader2, MessageSquare, Paperclip } from 'lucide-react';
import { Priority } from '@/types';

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  todo: { bg: '#f3f4f6', color: '#6b7280', label: 'Pending' },
  in_progress: { bg: '#dbeafe', color: '#2563eb', label: 'In Progress' },
  in_review: { bg: '#fef3c7', color: '#f59e0b', label: 'In Review' },
  done: { bg: '#dcfce7', color: '#22c55e', label: 'Completed' },
  cancelled: { bg: '#fee2e2', color: '#ef4444', label: 'Cancelled' },
};

export default function MyTasksPage() {
  const { openTaskPanel } = useUIStore();
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  const currentUserId = (user as any)?.id ?? '';

  useEffect(() => {
    if (!currentUserId) { setLoading(false); return; }

    const loadMyTasks = async () => {
      setLoading(true);
      try {
        const workspaces = await workspacesApi.list();
        const projectArrays = await Promise.all(
          workspaces.map((ws) => projectsApi.listByWorkspace(ws.id).catch(() => []))
        );
        const allProjects = projectArrays.flat();
        const taskArrays = await Promise.all(
          allProjects.map((p) => tasksApi.listByProject(p.id).catch(() => []))
        );
        const allTasks = taskArrays.flat();
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

  useEffect(() => {
    if (!currentUserId) return;
    let mounted = true;
    let socket: Awaited<ReturnType<typeof getSocket>> | null = null;
    const workspaceIds = new Set<string>();

    const hydrateWorkspaceRooms = async () => {
      try {
        const list = await workspacesApi.list();
        list.forEach((w) => workspaceIds.add(w.id));
        socket = await getSocket();
        if (!mounted) return;
        workspaceIds.forEach((id) => socket?.emit(SOCKET_EVENTS.JOIN_WORKSPACE, id));

        const reload = async () => {
          try {
            const projectArrays = await Promise.all(
              list.map((ws) => projectsApi.listByWorkspace(ws.id).catch(() => []))
            );
            const allProjects = projectArrays.flat();
            const taskArrays = await Promise.all(
              allProjects.map((p) => tasksApi.listByProject(p.id).catch(() => []))
            );
            const allTasks = taskArrays.flat();
            const mine = allTasks.filter((t) => (t.assignees ?? []).some((a) => a.id === currentUserId));
            if (mounted) setTasks(mine);
          } catch { }
        };

        socket.on(SOCKET_EVENTS.TASK_CREATED, reload);
        socket.on(SOCKET_EVENTS.TASK_UPDATED, reload);
        socket.on(SOCKET_EVENTS.TASK_DELETED, reload);
      } catch { }
    };

    hydrateWorkspaceRooms();

    return () => {
      mounted = false;
      if (socket) {
        workspaceIds.forEach((id) => socket?.emit(SOCKET_EVENTS.LEAVE_WORKSPACE, id));
        socket.off(SOCKET_EVENTS.TASK_CREATED);
        socket.off(SOCKET_EVENTS.TASK_UPDATED);
        socket.off(SOCKET_EVENTS.TASK_DELETED);
      }
    };
  }, [currentUserId]);

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return t.status === 'todo';
    if (activeFilter === 'in_progress') return t.status === 'in_progress';
    if (activeFilter === 'completed') return t.status === 'done';
    return true;
  });

  const pendingCount = tasks.filter((t) => t.status === 'todo').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const completedCount = tasks.filter((t) => t.status === 'done').length;

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

      <div className="page-content scroll-y" style={{ background: '#f8fafc' }}>
        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <FilterTab
            label="All"
            count={tasks.length}
            active={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
          />
          <FilterTab
            label="Pending"
            count={pendingCount}
            active={activeFilter === 'pending'}
            onClick={() => setActiveFilter('pending')}
          />
          <FilterTab
            label="In Progress"
            count={inProgressCount}
            active={activeFilter === 'in_progress'}
            onClick={() => setActiveFilter('in_progress')}
          />
          <FilterTab
            label="Completed"
            count={completedCount}
            active={activeFilter === 'completed'}
            onClick={() => setActiveFilter('completed')}
          />
        </div>

        {/* Task Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: 20
        }}>
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => openTaskPanel(task.id)}
            />
          ))}
        </div>

        {tasks.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
            <CheckSquare size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>All caught up!</h3>
            <p style={{ fontSize: 13 }}>No tasks assigned to you.</p>
          </div>
        )}

        {filteredTasks.length === 0 && tasks.length > 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 14 }}>No tasks match the selected filter.</p>
          </div>
        )}
      </div>

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function FilterTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderRadius: 20,
        border: '1px solid',
        borderColor: active ? '#2563eb' : '#e5e7eb',
        background: active ? '#2563eb' : 'white',
        color: active ? 'white' : '#374151',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {label}
      <span style={{
        background: active ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
        color: active ? 'white' : '#6b7280',
        padding: '2px 8px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
      }}>
        {count}
      </span>
    </button>
  );
}

function TaskCard({ task, onClick }: { task: ApiTask; onClick: () => void }) {
  const statusConfig = STATUS_COLORS[task.status] || STATUS_COLORS.todo;
  const priorityConfig = PRIORITY_CONFIG[task.priority as Priority];
  const progress = task.subtask_total > 0
    ? (task.subtask_done / task.subtask_total) * 100
    : task.status === 'done' ? 100 : 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        padding: 20,
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header with Status and Priority */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{
          background: statusConfig.bg,
          color: statusConfig.color,
          padding: '4px 12px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'capitalize',
        }}>
          {statusConfig.label}
        </span>
        <span style={{
          background: priorityConfig?.bg || '#f3f4f6',
          color: priorityConfig?.color || '#6b7280',
          padding: '4px 12px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 600,
        }}>
          {priorityConfig?.label || task.priority} Priority
        </span>
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: 16,
        fontWeight: 700,
        color: '#111827',
        marginBottom: 8,
        lineHeight: 1.4,
      }}>
        {task.title}
      </h3>

      {/* Description */}
      {task.description && (
        <p style={{
          fontSize: 13,
          color: '#6b7280',
          marginBottom: 16,
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {task.description}
        </p>
      )}

      {/* Progress Section */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
            Task Done: {task.subtask_done} / {task.subtask_total}
          </span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div style={{
          height: 6,
          background: '#e5e7eb',
          borderRadius: 3,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: task.status === 'done' ? '#22c55e' : '#2563eb',
            borderRadius: 3,
            transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Start Date</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
            {task.created_at ? formatDate(task.created_at) : 'N/A'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Due Date</div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: isOverdue(task.due_date ?? undefined) ? '#ef4444' : '#374151'
          }}>
            {task.due_date ? formatDate(task.due_date) : 'No due date'}
          </div>
        </div>
      </div>

      {/* Footer with Assignees and Icons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Assignee Avatars */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {(task.assignees ?? []).slice(0, 3).map((assignee, i) => (
            <div
              key={assignee.id}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                border: '2px solid white',
                marginLeft: i > 0 ? -8 : 0,
                overflow: 'hidden',
              }}
              title={assignee.full_name || assignee.email}
            >
              {assignee.avatar_url ? (
                <img src={assignee.avatar_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover' }} />
              ) : (
                (assignee.full_name || assignee.email)?.[0]?.toUpperCase()
              )}
            </div>
          ))}
          {(task.assignees ?? []).length > 3 && (
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#f3f4f6',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
              border: '2px solid white',
              marginLeft: -8,
            }}>
              +{(task.assignees ?? []).length - 3}
            </div>
          )}
        </div>

        {/* Icons */}
        <div style={{ display: 'flex', gap: 16, color: '#9ca3af' }}>
          {task.comment_count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MessageSquare size={14} />
              <span style={{ fontSize: 12 }}>{task.comment_count}</span>
            </div>
          )}
          {task.attachment_count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Paperclip size={14} />
              <span style={{ fontSize: 12 }}>{task.attachment_count}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



