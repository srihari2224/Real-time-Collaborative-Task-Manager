'use client';

import { useState, useEffect, useRef, CSSProperties } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TopBar } from '@/components/layout/TopBar';
import { formatDate, isOverdue } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { workspacesApi, projectsApi, tasksApi, type ApiTask } from '@/lib/apiClient';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';
import {
  CheckSquare, MessageSquare, Paperclip,
  Calendar, Clock, ListChecks, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Config ──────────────────────────────────────────────────────────────── */
const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  todo:        { label: 'Todo',        color: '#a3a3a3', bg: 'rgba(163,163,163,0.08)',  dot: '#525252' },
  in_progress: { label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  dot: '#f59e0b' },
  in_review:   { label: 'In Review',   color: '#a855f7', bg: 'rgba(168,85,247,0.10)',  dot: '#a855f7' },
  done:        { label: 'Done',        color: '#22c55e', bg: 'rgba(34,197,94,0.10)',   dot: '#22c55e' },
  cancelled:   { label: 'Cancelled',   color: '#ef4444', bg: 'rgba(239,68,68,0.10)',   dot: '#ef4444' },
};

const PRIORITY_META: Record<string, { label: string; color: string; bg: string; border: string; stripe: string }> = {
  urgent: { label: 'Urgent', color: '#ef4444', bg: 'rgba(239,68,68,0.09)',  border: 'rgba(239,68,68,0.25)',  stripe: '#ef4444' },
  high:   { label: 'High',   color: '#f97316', bg: 'rgba(249,115,22,0.09)', border: 'rgba(249,115,22,0.25)', stripe: '#f97316' },
  medium: { label: 'Medium', color: '#3b82f6', bg: 'rgba(59,130,246,0.09)', border: 'rgba(59,130,246,0.25)', stripe: '#3b82f6' },
  low:    { label: 'Low',    color: '#525252', bg: 'rgba(82,82,82,0.09)',   border: 'rgba(82,82,82,0.25)',   stripe: '#333333' },
};

type FilterKey = 'all' | 'pending' | 'in_progress' | 'completed';
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'pending',     label: 'Todo' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Done' },
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

/* ─── Skeleton Card ───────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderLeft: '3px solid var(--bg-elevated)',
      display: 'flex', overflow: 'hidden',
    }}>
      <div style={{ flex: 1, padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="skeleton" style={{ height: 18, width: 70 }} />
          <div className="skeleton" style={{ height: 18, width: 55 }} />
        </div>
        <div className="skeleton" style={{ height: 14, width: '75%' }} />
        <div className="skeleton" style={{ height: 11, width: '90%' }} />
        <div className="skeleton" style={{ height: 11, width: '60%' }} />
        <div style={{ display: 'flex', gap: 7 }}>
          <div className="skeleton" style={{ height: 22, width: 80 }} />
          <div className="skeleton" style={{ height: 22, width: 90 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: 0 }}>
            <div className="skeleton" style={{ width: 26, height: 26 }} />
            <div className="skeleton" style={{ width: 26, height: 26, marginLeft: -5 }} />
          </div>
          <div className="skeleton" style={{ height: 12, width: 40 }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────────── */
export default function MyTasksPage() {
  const queryClient = useQueryClient();
  const { openTaskPanel } = useUIStore();
  const { user } = useAuthStore();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const recentlyUpdatedIds = useRef<Set<string>>(new Set());

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
          if (mine(payload.task)) {
            recentlyUpdatedIds.current.add(payload.task.id);
            setTimeout(() => recentlyUpdatedIds.current.delete(payload.task.id), 1000);
          }
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
    all:         tasks.length,
    pending:     tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress' || t.status === 'in_review').length,
    completed:   tasks.filter((t) => t.status === 'done').length,
  };

  const filtered = tasks.filter((t) => {
    if (activeFilter === 'pending') return t.status === 'todo';
    if (activeFilter === 'in_progress') return t.status === 'in_progress' || t.status === 'in_review';
    if (activeFilter === 'completed') return t.status === 'done';
    return true;
  });

  const overdueTasks = tasks.filter((t) => isOverdue(t.due_date ?? undefined)).length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;

  /* ── Skeleton Loading ── */
  if (currentUserId && isPending && data === undefined) {
    return (
      <>
        <style>{CSS}</style>
        <div className="mt-root">
          <TopBar title="My Tasks" />
          <div className="mt-body">
            {/* Stats skeleton */}
            <div className="mt-stats">
              {[1,2,3].map(i => (
                <div key={i} className="mt-stat-card">
                  <div className="skeleton" style={{ height: 10, width: 60 }} />
                  <div className="skeleton" style={{ height: 28, width: 40, marginTop: 8 }} />
                </div>
              ))}
            </div>
            {/* Filter skeleton */}
            <div className="mt-filters">
              {[60,90,100,60].map((w, i) => (
                <div key={i} className="skeleton" style={{ height: 32, width: w }} />
              ))}
            </div>
            {/* Card skeletons */}
            <div className="mt-grid">
              {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
            </div>
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

          {/* Stats Row */}
          <div className="mt-stats">
            <div className="mt-stat-card">
              <span className="mt-stat-label">Total</span>
              <span className="mt-stat-value">{tasks.length}</span>
            </div>
            <div className="mt-stat-card">
              <span className="mt-stat-label">In Progress</span>
              <span className={`mt-stat-value ${inProgressCount > 0 ? 'highlight' : ''}`}>{inProgressCount}</span>
            </div>
            <div className="mt-stat-card">
              <span className="mt-stat-label">Overdue</span>
              <span className={`mt-stat-value ${overdueTasks > 0 ? 'overdue' : ''}`}>{overdueTasks}</span>
            </div>
          </div>

          {/* Filter tabs */}
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

          {/* Empty states */}
          {tasks.length === 0 && (
            <div className="mt-empty">
              <div className="mt-empty-icon"><CheckSquare size={22} /></div>
              <h3>All caught up</h3>
              <p>No tasks assigned to you yet.</p>
            </div>
          )}
          {filtered.length === 0 && tasks.length > 0 && (
            <div className="mt-empty">
              <div className="mt-empty-icon"><ListChecks size={22} /></div>
              <h3>No tasks here</h3>
              <p>No tasks match this filter.</p>
            </div>
          )}

          {/* Grid */}
          <div className="mt-grid">
            <AnimatePresence>
              {filtered.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ delay: i * 0.03, duration: 0.14 }}
                >
                  <TaskCard
                    task={task}
                    onClick={() => openTaskPanel(task.id)}
                    isRecentlyUpdated={recentlyUpdatedIds.current.has(task.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </>
  );
}

/* ─── Task Card ───────────────────────────────────────────────────────────── */
function TaskCard({ task, onClick, isRecentlyUpdated }: { task: ApiTask; onClick: () => void; isRecentlyUpdated?: boolean }) {
  const status = STATUS_META[task.status] ?? STATUS_META.todo;
  const priority = PRIORITY_META[task.priority] ?? PRIORITY_META.low;

  const progress = task.subtask_total > 0
    ? (task.subtask_done / task.subtask_total) * 100
    : task.status === 'done' ? 100 : 0;

  const overdue = isOverdue(task.due_date ?? undefined);

  const progressBg = task.status === 'done'
    ? 'linear-gradient(90deg,#22c55e,#4ade80)'
    : 'linear-gradient(90deg,#3b82f6,#60a5fa)';

  return (
    <div
      className={`mt-task-card${isRecentlyUpdated ? ' realtime-flash' : ''}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      role="button"
      tabIndex={0}
    >
      {/* Priority stripe */}
      <span className={`mt-stripe priority-${task.priority}`} />

      <div className="mt-card-inner">

        {/* Badges */}
        <div className="mt-badges">
          <span className={`mt-badge status-${task.status}`}>
            <span className="mt-badge-dot" />
            {status.label}
          </span>
          <span className={`mt-badge mt-priority-badge priority-${task.priority}`}>
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
              <ListChecks size={11} />
              <span className="font-mono">{String(task.subtask_done ?? 0).padStart(2,'0')} / {String(task.subtask_total ?? 0).padStart(2,'0')}</span>
            </span>
            <span className="mt-prog-pct font-mono">{Math.round(progress)}%</span>
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
            <Calendar size={11} />
            <span className="font-mono">{task.created_at ? formatDate(task.created_at) : 'N/A'}</span>
          </span>
          <span className={`mt-date-chip${overdue ? ' overdue' : ''}`}>
            {overdue ? <AlertTriangle size={11} /> : <Clock size={11} />}
            <span className="font-mono">{task.due_date ? formatDate(task.due_date) : 'No due date'}</span>
          </span>
        </div>

        {/* Footer */}
        <div className="mt-footer">
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

          <div className="mt-meta-icons">
            {(task.comment_count ?? 0) > 0 && (
              <span className="mt-meta-chip">
                <MessageSquare size={11} />
                <span className="font-mono">{task.comment_count}</span>
              </span>
            )}
            {(task.attachment_count ?? 0) > 0 && (
              <span className="mt-meta-chip">
                <Paperclip size={11} />
                <span className="font-mono">{task.attachment_count}</span>
              </span>
            )}
            <ChevronRight size={13} className="mt-arrow" />
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Space+Mono:wght@400;700&display=swap');

.mt-root {
  --mt-font:      'Inter', sans-serif;
  --mt-mono:      'Space Mono', monospace;
  --mt-bg:        #000000;
  --mt-surface:   #0a0a0a;
  --mt-elevated:  #111111;
  --mt-overlay:   #161616;
  --mt-txt:       #ffffff;
  --mt-txt2:      #a3a3a3;
  --mt-muted:     #525252;
  --mt-border:    rgba(255,255,255,0.06);
  --mt-border2:   rgba(255,255,255,0.10);
  --mt-accent:    #3b82f6;
  --mt-acc-soft:  rgba(59,130,246,0.12);
  --mt-t:         150ms cubic-bezier(0.4, 0, 0.2, 1);

  display: flex; flex-direction: column;
  height: 100%; font-family: var(--mt-font);
  background: var(--mt-bg);
  color: var(--mt-txt);
}

/* ── Light mode override ── */
html.light .mt-root {
  --mt-bg:        #f5f5f5;
  --mt-surface:   #ffffff;
  --mt-elevated:  #f0f0f0;
  --mt-overlay:   #e8e8e8;
  --mt-txt:       #0a0a0a;
  --mt-txt2:      #404040;
  --mt-muted:     #737373;
  --mt-border:    rgba(0,0,0,0.06);
  --mt-border2:   rgba(0,0,0,0.11);
  --mt-accent:    #2563eb;
  --mt-acc-soft:  rgba(37,99,235,0.10);
}

/* Stats row */
.mt-stats {
  display: flex; gap: 0;
  margin-bottom: 24px;
  border: 1px solid var(--mt-border);
}
.mt-stat-card {
  flex: 1; padding: 16px 20px;
  border-right: 1px solid var(--mt-border);
  background: var(--mt-surface);
}
.mt-stat-card:last-child { border-right: none; }
.mt-stat-label {
  display: block;
  font-size: 9px; font-weight: 700;
  font-family: var(--mt-mono);
  color: var(--mt-muted);
  text-transform: uppercase; letter-spacing: 0.1em;
  margin-bottom: 6px;
}
.mt-stat-value {
  display: block;
  font-size: 26px; font-weight: 900;
  font-family: var(--mt-font);
  color: var(--mt-txt);
  line-height: 1; letter-spacing: -0.04em;
}

/* Body */
.mt-body {
  flex: 1; overflow-y: auto;
  padding: 24px;
  background: var(--mt-bg);
}

/* Filter tabs */
.mt-filters {
  display: flex; gap: 0;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--mt-border);
}
.mt-ftab {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px;
  border: none; border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--mt-muted);
  font-size: 11px; font-weight: 700;
  font-family: var(--mt-mono);
  text-transform: uppercase; letter-spacing: 0.06em;
  cursor: pointer; flex-shrink: 0;
  transition: color var(--mt-t), border-color var(--mt-t);
  margin-bottom: -1px;
}
.mt-ftab:hover { color: var(--mt-txt2); }
.mt-ftab.active { color: var(--mt-accent); border-bottom-color: var(--mt-accent); }
.mt-ftab-count {
  font-size: 10px; font-weight: 700;
  padding: 1px 6px;
  background: var(--mt-elevated);
  color: var(--mt-muted); font-family: var(--mt-mono);
}
.mt-ftab.active .mt-ftab-count {
  background: var(--mt-acc-soft);
  color: var(--mt-accent);
}

/* Empty */
.mt-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 80px 20px; text-align: center;
}
.mt-empty-icon {
  width: 56px; height: 56px;
  background: var(--mt-surface);
  border: 1px solid var(--mt-border);
  display: flex; align-items: center; justify-content: center;
  color: var(--mt-muted); margin-bottom: 16px;
}
.mt-empty h3 {
  font-size: 14px; font-weight: 700;
  font-family: var(--mt-mono);
  color: var(--mt-txt2); margin-bottom: 6px;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.mt-empty p { font-size: 12px; color: var(--mt-muted); }

/* Grid */
.mt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
}

/* Task card */
.mt-task-card {
  display: flex; overflow: hidden;
  background: var(--mt-surface);
  border: 1px solid var(--mt-border);
  cursor: pointer;
  transition: all var(--mt-t);
  outline: none;
}
.mt-task-card:hover {
  border-color: var(--mt-border2);
  background: var(--mt-elevated);
}
.mt-task-card:focus-visible {
  outline: 1px solid var(--mt-accent);
  outline-offset: 2px;
}

/* Stripe */
.mt-stripe { width: 3px; flex-shrink: 0; display: block; }

/* Inner */
.mt-card-inner {
  flex: 1; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 10px;
  min-width: 0;
}

/* Badges */
.mt-badges { display: flex; gap: 6px; flex-wrap: wrap; }
.mt-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 7px;
  font-size: 10px; font-weight: 700;
  font-family: var(--mt-mono);
  text-transform: uppercase; letter-spacing: 0.06em;
}
.mt-badge-dot { width: 5px; height: 5px; flex-shrink: 0; display: inline-block; }
.mt-priority-badge { font-size: 9.5px; }

/* Stat highlights */
.mt-stat-value.highlight { color: var(--warning); }
.mt-stat-value.overdue { color: var(--error); }

/* Status badges map to semantic variables */
.mt-badge.status-todo { color: var(--text-muted); background: var(--bg-hover); border: 1px solid var(--border-subtle); }
.mt-badge.status-in_progress { color: var(--warning); background: var(--warning-soft); border: 1px solid rgba(245,158,11,0.25); }
.mt-badge.status-in_review { color: var(--review); background: var(--review-soft); border: 1px solid rgba(168,85,247,0.25); }
.mt-badge.status-done { color: var(--success); background: var(--success-soft); border: 1px solid rgba(34,197,94,0.25); }
.mt-badge.status-cancelled { color: var(--error); background: var(--error-soft); border: 1px solid rgba(239,68,68,0.25); }
.mt-badge .mt-badge-dot { background: currentColor; opacity: 0.9; }

/* Priority badges */
.mt-priority-badge.priority-urgent { color: var(--priority-urgent); background: var(--priority-urgent-soft); border: 1px solid rgba(239,68,68,0.25); }
.mt-priority-badge.priority-high { color: var(--priority-high); background: var(--priority-high-soft); border: 1px solid rgba(249,115,22,0.25); }
.mt-priority-badge.priority-medium { color: var(--priority-medium); background: var(--priority-medium-soft); border: 1px solid rgba(59,130,246,0.25); }
.mt-priority-badge.priority-low { color: var(--priority-low); background: var(--priority-low-soft); border: 1px solid var(--border-subtle); }

/* Priority stripe classes */
.mt-stripe.priority-urgent { background: var(--priority-urgent); }
.mt-stripe.priority-high { background: var(--priority-high); }
.mt-stripe.priority-medium { background: var(--priority-medium); }
.mt-stripe.priority-low { background: var(--priority-low); }

/* Title */
.mt-card-title {
  font-size: 13.5px; font-weight: 700;
  color: var(--mt-txt); line-height: 1.35;
  letter-spacing: -0.015em; margin: 0;
  font-family: var(--mt-font);
}

/* Desc */
.mt-card-desc {
  font-size: 12px; color: var(--mt-muted);
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
  font-size: 11px; font-weight: 600; color: var(--mt-txt2);
}
.mt-prog-pct { font-size: 11px; font-weight: 700; color: var(--mt-muted); }
.mt-prog-track { height: 2px; background: var(--mt-elevated); overflow: hidden; }
.mt-prog-fill { height: 100%; transition: width 600ms cubic-bezier(0.16,1,0.3,1); }

/* Dates */
.mt-dates { display: flex; gap: 6px; flex-wrap: wrap; }
.mt-date-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 8px;
  background: var(--mt-elevated);
  border: 1px solid var(--mt-border);
  font-size: 10.5px; font-weight: 600;
  color: var(--mt-txt2);
}
.mt-date-chip.overdue {
  background: var(--error-soft);
  border-color: rgba(239,68,68,0.22);
  color: var(--error);
}

/* Footer */
.mt-footer {
  display: flex; align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid var(--mt-border);
}

/* Assignees */
.mt-assignees { display: flex; }
.mt-avatar {
  width: 24px; height: 24px;
  background: var(--mt-acc-soft); color: var(--mt-accent);
  font-size: 10px; font-weight: 700;
  font-family: var(--mt-mono);
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--mt-surface);
  margin-left: -5px; overflow: hidden; flex-shrink: 0;
}
.mt-avatar:first-child { margin-left: 0; }
.mt-avatar img { width: 100%; height: 100%; object-fit: cover; }
.mt-avatar-overflow { background: var(--mt-elevated); color: var(--mt-muted); font-size: 9px; }

/* Meta icons */
.mt-meta-icons { display: flex; align-items: center; gap: 8px; color: var(--mt-muted); }
.mt-meta-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: var(--mt-muted); }
.mt-arrow { color: var(--mt-muted); opacity: 0; transition: opacity var(--mt-t), transform var(--mt-t); }
.mt-task-card:hover .mt-arrow { opacity: 1; transform: translateX(3px); }

/* Realtime flash */
.realtime-flash { animation: realtime-flash-anim 0.9s ease-out; }
@keyframes realtime-flash-anim {
  0%, 100% { background: var(--mt-surface); }
  25% { background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.4); }
}

/* Responsive */
@media (max-width: 640px) {
  .mt-body { padding: 14px; }
  .mt-grid { grid-template-columns: 1fr; gap: 8px; }
  .mt-stats { flex-direction: column; }
  .mt-stat-card { border-right: none; border-bottom: 1px solid var(--mt-border); }
  .mt-stat-card:last-child { border-bottom: none; }
  .mt-ftab { padding: 8px 12px; font-size: 10px; }
  .mt-card-inner { padding: 12px 13px; }
}
`;