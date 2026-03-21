'use client';

import { useState, useEffect, CSSProperties } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TopBar } from '@/components/layout/TopBar';
import { formatDate, isOverdue } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { workspacesApi, projectsApi, tasksApi, type ApiTask } from '@/lib/apiClient';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';
import {
  CheckSquare, Loader2, MessageSquare, Paperclip,
  Calendar, Clock, ListChecks,
  ChevronRight, AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Config                                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */
const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  todo: { label: 'To Do', color: '#64748b', bg: 'rgba(100,116,139,0.12)', dot: '#64748b' },
  in_progress: { label: 'In Progress', color: '#d97706', bg: 'rgba(217,119,6,0.12)', dot: '#d97706' },
  in_review: { label: 'In Review', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', dot: '#7c3aed' },
  done: { label: 'Done', color: '#16a34a', bg: 'rgba(22,163,74,0.12)', dot: '#16a34a' },
  cancelled: { label: 'Cancelled', color: '#dc2626', bg: 'rgba(220,38,38,0.12)', dot: '#dc2626' },
};

const PRIORITY_META: Record<string, { label: string; color: string; bg: string; border: string; stripe: string }> = {
  urgent: { label: 'Urgent', color: '#dc2626', bg: 'rgba(220,38,38,0.09)', border: 'rgba(220,38,38,0.25)', stripe: '#dc2626' },
  high: { label: 'High', color: '#ea580c', bg: 'rgba(234,88,12,0.09)', border: 'rgba(234,88,12,0.25)', stripe: '#ea580c' },
  medium: { label: 'Medium', color: '#2563eb', bg: 'rgba(37,99,235,0.09)', border: 'rgba(37,99,235,0.25)', stripe: '#2563eb' },
  low: { label: 'Low', color: '#64748b', bg: 'rgba(100,116,139,0.09)', border: 'rgba(100,116,139,0.25)', stripe: '#94a3b8' },
};

type FilterKey = 'all' | 'pending' | 'in_progress' | 'completed';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Done' },
];

async function fetchMyTasks(userId: string): Promise<ApiTask[]> {
  const workspaces = await workspacesApi.list();
  const projectArrays = await Promise.all(
    workspaces.map((ws) => projectsApi.listByWorkspace(ws.id).catch(() => [] as Awaited<ReturnType<typeof projectsApi.listByWorkspace>>)),
  );
  const allProjects = projectArrays.flat();
  const taskArrays = await Promise.all(
    allProjects.map((p) => tasksApi.listByProject(p.id).catch(() => [] as ApiTask[])),
  );
  return taskArrays
    .flat()
    .filter((t) => (t.assignees ?? []).some((a) => a.id === userId));
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Component                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function MyTasksPage() {
  const queryClient = useQueryClient();
  const { openTaskPanel } = useUIStore();
  const { user } = useAuthStore();

  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const currentUserId = user?.id ?? '';

  const { data, isPending } = useQuery({
    queryKey: ['my-tasks', currentUserId],
    queryFn: () => fetchMyTasks(currentUserId),
    enabled: !!currentUserId,
    staleTime: 60_000,
    gcTime: 300_000,
    placeholderData: (prev) => prev,
  });

  const tasks = data ?? [];

  /* ── Realtime ── */
  useEffect(() => {
    if (!currentUserId) return;
    let mounted = true;
    let socket: Awaited<ReturnType<typeof getSocket>> | null = null;
    const wsIds = new Set<string>();
    const mine = (t: ApiTask) => (t.assignees ?? []).some((a) => a.id === currentUserId);

    const init = async () => {
      try {
        const list = await workspacesApi.list();
        list.forEach((w) => wsIds.add(w.id));
        socket = await getSocket();
        if (!mounted) return;
        wsIds.forEach((id) => socket?.emit(SOCKET_EVENTS.JOIN_WORKSPACE, id));

        socket.on(SOCKET_EVENTS.TASK_CREATED, (payload: { task: ApiTask }) => {
          if (!mounted || !mine(payload.task)) return;
          queryClient.setQueryData<ApiTask[]>(['my-tasks', currentUserId], (old) => {
            const o = old ?? [];
            return o.some((x) => x.id === payload.task.id) ? o : [...o, payload.task];
          });
        });
        socket.on(SOCKET_EVENTS.TASK_UPDATED, (payload: { task: ApiTask }) => {
          if (!mounted) return;
          queryClient.setQueryData<ApiTask[]>(['my-tasks', currentUserId], (old) => {
            const o = old ?? [];
            const assigned = mine(payload.task);
            const has = o.some((x) => x.id === payload.task.id);
            if (assigned && has) return o.map((x) => (x.id === payload.task.id ? payload.task : x));
            if (assigned && !has) return [...o, payload.task];
            if (!assigned && has) return o.filter((x) => x.id !== payload.task.id);
            return o;
          });
        });
        socket.on(SOCKET_EVENTS.TASK_DELETED, (payload: { taskId: string }) => {
          if (!mounted) return;
          queryClient.setQueryData<ApiTask[]>(['my-tasks', currentUserId], (old) =>
            (old ?? []).filter((t) => t.id !== payload.taskId)
          );
        });
      } catch { /* silent */ }
    };

    init();
    return () => {
      mounted = false;
      if (socket) {
        wsIds.forEach((id) => socket?.emit(SOCKET_EVENTS.LEAVE_WORKSPACE, id));
        socket.off(SOCKET_EVENTS.TASK_CREATED);
        socket.off(SOCKET_EVENTS.TASK_UPDATED);
        socket.off(SOCKET_EVENTS.TASK_DELETED);
      }
    };
  }, [currentUserId, queryClient]);

  /* ── Derived counts ── */
  const counts: Record<FilterKey, number> = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress' || t.status === 'in_review').length,
    completed: tasks.filter((t) => t.status === 'done').length,
  };

  const filtered = tasks.filter((t) => {
    if (activeFilter === 'pending') return t.status === 'todo';
    if (activeFilter === 'in_progress') return t.status === 'in_progress' || t.status === 'in_review';
    if (activeFilter === 'completed') return t.status === 'done';
    return true;
  });

  /* ── Loading ── */
  if (currentUserId && isPending && data === undefined) {
    return (
      <>
        <style>{CSS}</style>
        <div className="mt-root">
          <TopBar title="My Tasks" />
          <div className="mt-loader">
            <Loader2 size={20} className="mt-spin" />
            <span>Loading your tasks…</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="mt-root">
        <TopBar title="My Tasks" />

        <div className="mt-body">

          {/* ── Filter tabs ── */}
          <div className="mt-filters">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`mt-ftab${activeFilter === f.key ? ' active' : ''}`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
                <span className="mt-ftab-count">{counts[f.key]}</span>
              </button>
            ))}
          </div>

          {/* ── Empty states ── */}
          {tasks.length === 0 && (
            <div className="mt-empty">
              <div className="mt-empty-icon"><CheckSquare size={28} /></div>
              <h3>All caught up!</h3>
              <p>No tasks assigned to you yet.</p>
            </div>
          )}
          {filtered.length === 0 && tasks.length > 0 && (
            <div className="mt-empty">
              <div className="mt-empty-icon"><ListChecks size={28} /></div>
              <h3>No tasks here</h3>
              <p>No tasks match this filter.</p>
            </div>
          )}

          {/* ── Grid ── */}
          <div className="mt-grid">
            <AnimatePresence>
              {filtered.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: i * 0.04, duration: 0.15 }}
                >
                  <TaskCard task={task} onClick={() => openTaskPanel(task.id)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Sub-components                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
function TaskCard({ task, onClick }: { task: ApiTask; onClick: () => void }) {
  const status = STATUS_META[task.status] ?? STATUS_META.todo;
  const priority = PRIORITY_META[task.priority] ?? PRIORITY_META.low;

  const progress = task.subtask_total > 0
    ? (task.subtask_done / task.subtask_total) * 100
    : task.status === 'done' ? 100 : 0;

  const overdue = isOverdue(task.due_date ?? undefined);

  const progressBg = task.status === 'done'
    ? 'linear-gradient(90deg,#16a34a,#4ade80)'
    : 'linear-gradient(90deg,#2563eb,#60a5fa)';

  return (
    <div
      className="mt-task-card"
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      role="button"
      tabIndex={0}
    >
      {/* Priority stripe */}
      <span className="mt-stripe" style={{ background: priority.stripe } as CSSProperties} />

      <div className="mt-card-inner">

        {/* Badges */}
        <div className="mt-badges">
          <span
            className="mt-badge"
            style={{ color: status.color, background: status.bg } as CSSProperties}
          >
            <span className="mt-badge-dot" style={{ background: status.dot } as CSSProperties} />
            {status.label}
          </span>
          <span
            className="mt-badge mt-priority-badge"
            style={{ color: priority.color, background: priority.bg, border: `1px solid ${priority.border}` } as CSSProperties}
          >
            {priority.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-card-title">{task.title}</h3>

        {/* Description */}
        {task.description && (
          <p className="mt-card-desc">{task.description}</p>
        )}

        {/* Progress */}
        <div className="mt-progress">
          <div className="mt-prog-header">
            <span className="mt-prog-label">
              <ListChecks size={12} />
              {task.subtask_done ?? 0} / {task.subtask_total ?? 0} subtasks
            </span>
            <span className="mt-prog-pct">{Math.round(progress)}%</span>
          </div>
          <div className="mt-prog-track">
            <div
              className="mt-prog-fill"
              style={{ width: `${progress}%`, background: progressBg } as CSSProperties}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="mt-dates">
          <span className="mt-date-chip">
            <Calendar size={12} />
            {task.created_at ? formatDate(task.created_at) : 'N/A'}
          </span>
          <span className={`mt-date-chip${overdue ? ' overdue' : ''}`}>
            {overdue ? <AlertTriangle size={11} /> : <Clock size={12} />}
            {task.due_date ? formatDate(task.due_date) : 'No due date'}
          </span>
        </div>

        {/* Footer */}
        <div className="mt-footer">
          {/* Assignees */}
          <div className="mt-assignees">
            {(task.assignees ?? []).slice(0, 4).map((a, i) => (
              <span
                key={a.id}
                className="mt-avatar"
                title={a.full_name || a.email}
                style={{ zIndex: 10 - i } as CSSProperties}
              >
                {a.avatar_url
                  ? <img src={a.avatar_url} alt="" />
                  : (a.full_name || a.email)?.[0]?.toUpperCase()}
              </span>
            ))}
            {(task.assignees ?? []).length > 4 && (
              <span className="mt-avatar mt-avatar-overflow">
                +{(task.assignees ?? []).length - 4}
              </span>
            )}
          </div>

          {/* Icons */}
          <div className="mt-meta-icons">
            {(task.comment_count ?? 0) > 0 && (
              <span className="mt-meta-chip">
                <MessageSquare size={12} />
                {task.comment_count}
              </span>
            )}
            {(task.attachment_count ?? 0) > 0 && (
              <span className="mt-meta-chip">
                <Paperclip size={12} />
                {task.attachment_count}
              </span>
            )}
            <ChevronRight size={14} className="mt-arrow" />
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CSS                                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* ── Tokens light ── */
.mt-root {
  --mt-font:      'Plus Jakarta Sans', 'Inter', sans-serif;
  --mt-bg:        #f0f4f8;
  --mt-surface:   #ffffff;
  --mt-elevated:  #f7f9fc;
  --mt-overlay:   #eef2f7;
  --mt-txt:       #0f172a;
  --mt-txt2:      #475569;
  --mt-muted:     #94a3b8;
  --mt-border:    rgba(15,23,42,0.08);
  --mt-border2:   rgba(15,23,42,0.14);
  --mt-border3:   rgba(15,23,42,0.24);
  --mt-accent:    #2563eb;
  --mt-acc-soft:  rgba(37,99,235,0.10);
  --mt-radius:    10px;
  --mt-radius-sm: 6px;
  --mt-shadow:    0 1px 4px rgba(15,23,42,0.10);
  --mt-shadow-md: 0 4px 16px rgba(15,23,42,0.10);
  --mt-t:         150ms cubic-bezier(0.4, 0, 0.2, 1);

  display: flex; flex-direction: column;
  height: 100%; font-family: var(--mt-font);
  background: var(--mt-bg);
  color: var(--mt-txt);
  position: relative;
}

/* ── Tokens dark ── */
html.dark .mt-root {
  --mt-bg:        #0b1120;
  --mt-surface:   #111827;
  --mt-elevated:  #1c2333;
  --mt-overlay:   #243049;
  --mt-txt:       #f1f5f9;
  --mt-txt2:      #94a3b8;
  --mt-muted:     #64748b;
  --mt-border:    rgba(255,255,255,0.06);
  --mt-border2:   rgba(255,255,255,0.12);
  --mt-border3:   rgba(255,255,255,0.20);
  --mt-accent:    #3b82f6;
  --mt-acc-soft:  rgba(59,130,246,0.12);
  --mt-shadow:    0 1px 4px rgba(0,0,0,0.40);
  --mt-shadow-md: 0 4px 16px rgba(0,0,0,0.36);
}

/* ── Loader ── */
.mt-loader {
  flex: 1; display: flex; align-items: center;
  justify-content: center; gap: 10px;
  font-size: 14px; color: var(--mt-muted); font-family: var(--mt-font);
}
.mt-spin { animation: mt-spin 1s linear infinite; }
@keyframes mt-spin { to { transform: rotate(360deg); } }

/* ── Body ── */
.mt-body {
  flex: 1; overflow-y: auto;
  padding: 24px;
  background: var(--mt-bg);
}

/* ── Filter tabs ── */
.mt-filters {
  display: flex; gap: 6px;
  margin-bottom: 20px;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  padding-bottom: 2px;
}
.mt-ftab {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 16px; border-radius: 99px;
  border: 1.5px solid var(--mt-border2);
  background: var(--mt-surface);
  color: var(--mt-txt2);
  font-size: 13px; font-weight: 600;
  font-family: var(--mt-font); cursor: pointer;
  transition: background var(--mt-t), border-color var(--mt-t), color var(--mt-t), box-shadow var(--mt-t), transform var(--mt-t);
  flex-shrink: 0;
}
.mt-ftab:hover {
  border-color: var(--mt-accent);
  color: var(--mt-accent);
  background: var(--mt-acc-soft);
}
.mt-ftab.active {
  background: var(--mt-accent); color: #fff;
  border-color: var(--mt-accent);
  box-shadow: 0 2px 10px rgba(37,99,235,0.28);
}
.mt-ftab-count {
  font-size: 11px; font-weight: 700;
  padding: 2px 7px; border-radius: 99px;
  background: rgba(255,255,255,0.22); color: inherit;
}
.mt-ftab:not(.active) .mt-ftab-count {
  background: var(--mt-overlay); color: var(--mt-muted);
}

/* ── Empty ── */
.mt-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 80px 20px; text-align: center;
}
.mt-empty-icon {
  width: 64px; height: 64px; border-radius: 50%;
  background: var(--mt-elevated);
  border: 1px solid var(--mt-border);
  display: flex; align-items: center; justify-content: center;
  color: var(--mt-muted); margin-bottom: 16px;
}
.mt-empty h3 {
  font-size: 16px; font-weight: 700;
  color: var(--mt-txt2); margin-bottom: 6px;
  font-family: var(--mt-font);
}
.mt-empty p { font-size: 13.5px; color: var(--mt-muted); }

/* ── Grid ── */
.mt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}

/* ── Task card ── */
.mt-task-card {
  display: flex; overflow: hidden;
  background: var(--mt-surface);
  border: 1px solid var(--mt-border);
  border-radius: var(--mt-radius);
  cursor: pointer;
  transition: all var(--mt-t);
  box-shadow: var(--mt-shadow);
  outline: none;
}
.mt-task-card:hover {
  border-color: var(--mt-border2);
  box-shadow: var(--mt-shadow-md);
  transform: translateY(-2px);
}
.mt-task-card:focus-visible {
  outline: 2px solid var(--mt-accent);
  outline-offset: 2px;
}

/* Stripe */
.mt-stripe { width: 4px; flex-shrink: 0; display: block; }

/* Inner */
.mt-card-inner {
  flex: 1; padding: 15px 17px;
  display: flex; flex-direction: column; gap: 10px;
  min-width: 0;
}

/* Badges */
.mt-badges { display: flex; gap: 6px; flex-wrap: wrap; }
.mt-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 99px;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.02em; font-family: var(--mt-font);
}
.mt-badge-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
.mt-priority-badge { font-size: 10.5px; }

/* Title */
.mt-card-title {
  font-size: 14.5px; font-weight: 700;
  color: var(--mt-txt); line-height: 1.4;
  letter-spacing: -0.01em; margin: 0;
  font-family: var(--mt-font);
}

/* Desc */
.mt-card-desc {
  font-size: 12.5px; color: var(--mt-muted);
  line-height: 1.55; margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Progress */
.mt-progress { display: flex; flex-direction: column; gap: 6px; }
.mt-prog-header { display: flex; align-items: center; justify-content: space-between; }
.mt-prog-label {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600; color: var(--mt-txt2);
}
.mt-prog-pct { font-size: 12px; font-weight: 700; color: var(--mt-muted); }
.mt-prog-track {
  height: 5px; background: var(--mt-overlay); border-radius: 99px; overflow: hidden;
}
.mt-prog-fill {
  height: 100%; border-radius: 99px;
  transition: width 600ms cubic-bezier(0.16,1,0.3,1);
}

/* Dates */
.mt-dates { display: flex; gap: 8px; flex-wrap: wrap; }
.mt-date-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 9px;
  border-radius: var(--mt-radius-sm);
  background: var(--mt-elevated);
  border: 1px solid var(--mt-border);
  font-size: 11.5px; font-weight: 600;
  color: var(--mt-txt2); font-family: var(--mt-font);
}
.mt-date-chip.overdue {
  background: rgba(220,38,38,0.08);
  border-color: rgba(220,38,38,0.22);
  color: #dc2626;
}

/* Footer */
.mt-footer {
  display: flex; align-items: center;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 1px solid var(--mt-border);
}

/* Assignees */
.mt-assignees { display: flex; }
.mt-avatar {
  width: 27px; height: 27px; border-radius: 50%;
  background: var(--mt-acc-soft); color: var(--mt-accent);
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--mt-surface);
  margin-left: -7px; overflow: hidden;
  font-family: var(--mt-font); flex-shrink: 0;
}
.mt-avatar:first-child { margin-left: 0; }
.mt-avatar img { width: 100%; height: 100%; object-fit: cover; }
.mt-avatar-overflow { background: var(--mt-overlay); color: var(--mt-muted); font-size: 10px; }

/* Meta icons */
.mt-meta-icons { display: flex; align-items: center; gap: 10px; color: var(--mt-muted); }
.mt-meta-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: var(--mt-muted); }
.mt-arrow {
  color: var(--mt-muted); opacity: 0;
  transition: opacity var(--mt-t), transform var(--mt-t);
}
.mt-task-card:hover .mt-arrow { opacity: 1; transform: translateX(3px); }

/* ── Responsive ── */
@media (max-width: 640px) {
  .mt-body { padding: 14px; }
  .mt-grid { grid-template-columns: 1fr; gap: 10px; }
  .mt-filters { gap: 5px; }
  .mt-ftab { padding: 7px 12px; font-size: 12px; }
  .mt-card-inner { padding: 12px 13px; }
}
@media (max-width: 400px) {
  .mt-ftab { font-size: 11.5px; padding: 6px 9px; }
}
`;