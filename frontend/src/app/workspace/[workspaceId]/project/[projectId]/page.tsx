'use client';

import React, { useState, useEffect, CSSProperties } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TopBar } from '@/components/layout/TopBar';
import { ViewType } from '@/types';
import { useUIStore } from '@/stores/uiStore';
import {
  projectsApi, tasksApi, usersApi,
  type ApiProject, type ApiTask, type ApiUser,
} from '@/lib/apiClient';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts';
import {
  List, Calendar, BarChart2,
  Plus, Loader2, X,
  Sparkles, AlertTriangle, ChevronLeft, ChevronRight, Trash2,
} from 'lucide-react';
import { formatDate, isOverdue } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Static config                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
const PRIORITY_STYLE: Record<string, { color: string; bg: string; border: string; stripe: string }> = {
  urgent: { color: '#ef4444', bg: 'rgba(239,68,68,0.09)',   border: 'rgba(239,68,68,0.22)',   stripe: '#ef4444' },
  high:   { color: '#f97316', bg: 'rgba(249,115,22,0.09)', border: 'rgba(249,115,22,0.22)', stripe: '#f97316' },
  medium: { color: '#3b82f6', bg: 'rgba(59,130,246,0.09)', border: 'rgba(59,130,246,0.22)', stripe: '#3b82f6' },
  low:    { color: '#525252', bg: 'rgba(82,82,82,0.09)',   border: 'rgba(82,82,82,0.22)',   stripe: '#333333' },
};

/* Fix 1: Use React.ComponentType — needs explicit React import at top */
const VIEW_TABS: { key: ViewType; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { key: 'list', label: 'List', Icon: List },
  { key: 'calendar', label: 'Calendar', Icon: Calendar },
  { key: 'overview', label: 'Overview', Icon: BarChart2 },
];

const PIE_COLORS = ['#22c55e', '#a855f7', '#f59e0b', '#ef4444'];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Shared interface for the shape sub-components expect                        */
/* ─────────────────────────────────────────────────────────────────────────── */
interface KanbanAssignee {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  created_at: string;
}

interface KanbanTask extends Omit<ApiTask, 'assignees'> {
  section_id: string;
  assignees: KanbanAssignee[];
  watchers: never[];
  labels: never[];
  subtasks: never[];
  attachments: never[];
  unread_chat_count: number;
}

const KANBAN_COLUMNS: {
  key: 'todo' | 'in_progress' | 'done';
  label: string;
  match: (t: KanbanTask) => boolean;
}[] = [
  { key: 'todo', label: 'To Do', match: (t) => t.status === 'todo' || t.status === 'cancelled' },
  { key: 'in_progress', label: 'In Progress', match: (t) => t.status === 'in_progress' || t.status === 'in_review' },
  { key: 'done', label: 'Done', match: (t) => t.status === 'done' },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Page                                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeView, setActiveView, openTaskPanel } = useUIStore();
  const projectId = params?.projectId as string;
  const workspaceId = params?.workspaceId as string;

  const [showNewTask, setShowNewTask] = useState(false);

  const { data: project, isPending: projectPending, isError: projectError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const { data: tasks = [], isPending: tasksPending } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: () => tasksApi.listByProject(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (projectError) toast.error('Failed to load project');
  }, [projectError]);

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    let mounted = true;
    let s: Awaited<ReturnType<typeof getSocket>> | null = null;

    getSocket().then((socket) => {
      if (!mounted) return;
      s = socket;
      socket.emit(SOCKET_EVENTS.JOIN_WORKSPACE, workspaceId);

      socket.on(SOCKET_EVENTS.TASK_CREATED, (data: { task: ApiTask }) => {
        if (!mounted || data.task.project_id !== projectId) return;
        queryClient.setQueryData<ApiTask[]>(['project-tasks', projectId], (old) => {
          const o = old ?? [];
          return o.some((t) => t.id === data.task.id) ? o : [...o, data.task];
        });
        toast.success(`New task: ${data.task.title}`, { duration: 2000, id: `tc-${data.task.id}` });
      });
      socket.on(SOCKET_EVENTS.TASK_UPDATED, (data: { task: ApiTask }) => {
        if (!mounted || data.task.project_id !== projectId) return;
        queryClient.setQueryData<ApiTask[]>(['project-tasks', projectId], (old) =>
          (old ?? []).map((t) => (t.id === data.task.id ? data.task : t))
        );
      });
      socket.on(SOCKET_EVENTS.TASK_DELETED, (data: { taskId: string }) => {
        if (!mounted) return;
        queryClient.setQueryData<ApiTask[]>(['project-tasks', projectId], (old) =>
          (old ?? []).filter((t) => t.id !== data.taskId)
        );
      });
    }).catch(() => {});

    return () => {
      mounted = false;
      if (s) {
        s.emit(SOCKET_EVENTS.LEAVE_WORKSPACE, workspaceId);
        s.off(SOCKET_EVENTS.TASK_CREATED);
        s.off(SOCKET_EVENTS.TASK_UPDATED);
        s.off(SOCKET_EVENTS.TASK_DELETED);
      }
    };
  }, [workspaceId, projectId, queryClient]);

  const [showDeleteProjectConfirm, setShowDeleteProjectConfirm] = useState(false);

  const handleDeleteProject = async () => {
    setShowDeleteProjectConfirm(false);
    try {
      await projectsApi.delete(projectId);
      toast.success('Project deleted');
      router.push(`/workspace/${workspaceId}`);
    } catch {
      toast.error('Failed to delete project');
    }
  };


  const kanbanTasks: KanbanTask[] = tasks.map((t) => ({
    ...t,
    section_id: t.status,
    assignees: (t.assignees ?? []).map((a) => ({
      id: a.id,
      name: a.full_name ?? a.email ?? '',
      email: a.email,
      avatar_url: a.avatar_url,
      created_at: '',
    })),
    watchers: [] as never[],
    labels: [] as never[],
    subtasks: [] as never[],
    attachments: [] as never[],
    unread_chat_count: 0,
  }));

  const initialLoad = projectPending && !project;

  if (initialLoad) {
    return (
      <>
        <style>{CSS}</style>
        <div className="pp-root">
          <TopBar title="..." />
          {/* View bar skeleton */}
          <div className="pp-view-bar">
            <div style={{ display: 'flex', gap: 0, flex: 1 }}>
              {[60,70,80].map((w, i) => (
                <div key={i} className="skeleton" style={{ height: 14, width: w, margin: '12px 14px' }} />
              ))}
            </div>
            <div className="skeleton" style={{ height: 32, width: 100 }} />
          </div>
          {/* Kanban skeleton columns */}
          <div style={{ flex: 1, display: 'flex', gap: 12, padding: '16px 20px', overflow: 'hidden' }}>
            {[1,2,3].map((col) => (
              <div key={col} style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="skeleton" style={{ height: 10, width: 60 }} />
                  <div className="skeleton" style={{ height: 18, width: 24 }} />
                </div>
                <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1,2,3].map(c => (
                    <div key={c} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderLeft: '3px solid var(--bg-overlay)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className="skeleton" style={{ height: 12, width: '80%' }} />
                      <div className="skeleton" style={{ height: 10, width: '55%' }} />
                      <div style={{ display: 'flex', gap: 0 }}>
                        <div className="skeleton" style={{ width: 22, height: 22 }} />
                        <div className="skeleton" style={{ width: 22, height: 22, marginLeft: -4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="pp-root">
        <TopBar
          title={project?.name ?? 'Project'}
          actions={
            <button
              onClick={handleDeleteProject}
              className="topbar-icon-btn"
              style={{ color: '#ef4444' }}
              title="Delete Project"
            >
              <Trash2 size={15} />
            </button>
          }
        />

        <div className="pp-view-bar">
          <div className="pp-view-tabs">
            {VIEW_TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                className={`pp-view-tab${activeView === key ? ' active' : ''}`}
                onClick={() => setActiveView(key)}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
          <button type="button" className="pp-add-task-bar-btn" onClick={() => setShowNewTask(true)}>
            <Plus size={15} /> Add Task
          </button>
        </div>

        <div className="pp-content">
          {activeView === 'list' && (
            <KanbanView tasks={kanbanTasks} onTaskClick={openTaskPanel} loadingTasks={tasksPending && tasks.length === 0} />
          )}
          {activeView === 'calendar' && <CalendarView tasks={kanbanTasks} onTaskClick={openTaskPanel} />}
          {activeView === 'overview' && <OverviewView tasks={tasks} />}
        </div>

        <AnimatePresence>
          {showNewTask && (
            <NewTaskModal
              projectId={projectId}
              onClose={() => setShowNewTask(false)}
              onCreated={(task) => {
                queryClient.setQueryData<ApiTask[]>(['project-tasks', projectId], (old) => [
                  ...(old ?? []),
                  task,
                ]);
                setShowNewTask(false);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  New Task Modal                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
function NewTaskModal({ projectId, onClose, onCreated }: {
  projectId: string;
  onClose: () => void;
  onCreated: (t: ApiTask) => void;
}) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<ApiTask['priority']>('medium');
  const [dueDate, setDueDate] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [assignees, setAssignees] = useState<ApiUser[]>([]);
  const [lookupErr, setLookupErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const addEmail = async () => {
    const e = emailInput.trim().toLowerCase();
    if (!e) return;
    if (assignees.some((a) => a.email.toLowerCase() === e)) { setEmailInput(''); return; }
    setAdding(true); setLookupErr(null);
    try {
      const user = await usersApi.lookupByEmail(e);
      setAssignees((p) => [...p, user]);
      setEmailInput('');
      toast.success('Assignee added');
    } catch {
      setLookupErr('User not found');
      toast.error('User not found');
    } finally { setAdding(false); }
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const task = await (tasksApi.create as (p: unknown) => Promise<ApiTask>)({
        projectId,
        title: title.trim(),
        description: desc.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        assigneeEmails: assignees.map((a) => a.email),
      });
      toast.success('Task created!');
      onCreated(task);
    } catch {
      toast.error('Failed to create task');
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="pp-modal-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="pp-modal"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pp-modal-header">
          <div className="pp-modal-title-row">
            <span className="pp-modal-icon"><Sparkles size={16} /></span>
            <h3 className="pp-modal-title">New Task</h3>
          </div>
          <button type="button" className="pp-modal-close" onClick={onClose}><X size={15} /></button>
        </div>

        <form onSubmit={handleSubmit} className="pp-modal-form" noValidate>
          <div className="pp-field">
            <label className="pp-label" htmlFor="pp-task-title">Task title *</label>
            <input id="pp-task-title" autoFocus className="pp-input" placeholder="What needs to be done?" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="pp-field">
            <label className="pp-label" htmlFor="pp-task-desc">Description</label>
            <textarea id="pp-task-desc" className="pp-input pp-textarea" placeholder="Add more detail…" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>

          <div className="pp-field-row">
            <div className="pp-field" style={{ flex: 1 }}>
              <label className="pp-label" htmlFor="pp-task-pri">Priority</label>
              <select id="pp-task-pri" className="pp-select" value={priority} onChange={(e) => setPriority(e.target.value as ApiTask['priority'])}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="pp-field" style={{ flex: 1 }}>
              <label className="pp-label" htmlFor="pp-task-due">Due date</label>
              <input id="pp-task-due" type="date" className="pp-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="pp-field">
            <label className="pp-label">Assignees</label>
            <div className="pp-assignee-row">
              <input
                className="pp-input" placeholder="Add by email…"
                value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                style={{ flex: 1 }}
              />
              <button type="button" className="pp-add-btn" onClick={addEmail} disabled={adding}>
                {adding ? <Loader2 size={13} className="pp-spin" /> : <Plus size={13} />}
              </button>
            </div>
            {assignees.length > 0 && (
              <div className="pp-assignee-chips">
                {assignees.map((u) => (
                  <span key={u.id} className="pp-chip">
                    {u.full_name ?? u.email}
                    <button type="button" className="pp-chip-remove" onClick={() => setAssignees((p) => p.filter((x) => x.id !== u.id))}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {lookupErr
              ? <span className="pp-field-err">{lookupErr}</span>
              : <span className="pp-field-hint">Only registered users can be assigned</span>
            }
          </div>

          <div className="pp-modal-actions">
            <button type="button" className="pp-cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="pp-submit-btn" disabled={saving || !title.trim()}>
              {saving ? <><span className="pp-spinner" />Creating…</> : 'Create Task'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Kanban (3 columns)                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */
function KanbanView({
  tasks,
  onTaskClick,
  loadingTasks,
}: {
  tasks: KanbanTask[];
  onTaskClick: (id: string) => void;
  loadingTasks?: boolean;
}) {
  return (
    <div className="pp-kanban-root">
      {loadingTasks && (
        <div className="pp-kanban-loading">
          <div style={{ display: 'flex', gap: 8 }}>
            {[1,2,3].map(d => (
              <div key={d} className="skeleton" style={{ width: 8, height: 8, animationDelay: `${(d-1)*200}ms` }} />
            ))}
          </div>
        </div>
      )}
      <div className="pp-kanban-columns">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = tasks.filter(col.match);
          return (
            <div key={col.key} className="pp-kanban-col">
              <div className="pp-kanban-col-head">
                <span className="pp-kanban-col-title">{col.label}</span>
                <span className="pp-kanban-col-count">{colTasks.length}</span>
              </div>
              <div className="pp-kanban-col-body">
                {colTasks.length === 0 ? (
                  <div className="pp-kanban-empty">No tasks</div>
                ) : (
                  colTasks.map((task) => (
                    <KanbanCardCompact key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCardCompact({ task, onClick }: { task: KanbanTask; onClick: () => void }) {
  const ps = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.low;
  const overdueFlag = isOverdue(task.due_date ?? undefined);

  return (
    <div
      className="pp-kanban-card"
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      role="button"
      tabIndex={0}
    >
      <span className="pp-kanban-card-stripe" style={{ background: ps.stripe }} />
      <div className="pp-kanban-card-inner">
        <div className="pp-kanban-card-top">
          <h3 className="pp-kanban-card-title">{task.title}</h3>
          <span
            className="pp-kanban-pri"
            style={
              {
                color: ps.color,
                background: ps.bg,
                border: `1px solid ${ps.border}`,
              } as CSSProperties
            }
          >
            {task.priority}
          </span>
        </div>
        {task.due_date && (
          <div className={`pp-kanban-due${overdueFlag ? ' overdue' : ''}`}>
            {overdueFlag && <AlertTriangle size={11} />}
            {formatDate(task.due_date)}
          </div>
        )}
        <div className="pp-kanban-card-foot">
          <div className="pp-avatar-stack pp-kanban-avatars">
            {task.assignees.slice(0, 3).map((a, i) => (
              <span key={a.id} className="pp-avatar" title={a.name || a.email} style={{ zIndex: 10 - i }}>
                {a.avatar_url ? (
                  <img src={a.avatar_url} alt="" />
                ) : (
                  (a.name || a.email)?.[0]?.toUpperCase()
                )}
              </span>
            ))}
            {task.assignees.length > 3 && (
              <span className="pp-avatar pp-avatar-overflow">+{task.assignees.length - 3}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Calendar View                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
function CalendarView({ tasks, onTaskClick }: { tasks: KanbanTask[]; onTaskClick: (id: string) => void }) {
  const [cursor, setCursor] = useState(() => new Date());
  const today = new Date();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = cursor.toLocaleString('default', { month: 'long', year: 'numeric' });

  const tasksByDay: Record<number, KanbanTask[]> = {};
  tasks.forEach((t) => {
    if (!t.due_date) return;
    const d = new Date(t.due_date);
    if (d.getMonth() !== month || d.getFullYear() !== year) return;
    const day = d.getDate();
    if (!tasksByDay[day]) tasksByDay[day] = [];
    tasksByDay[day].push(t);
  });

  return (
    <div className="pp-cal-wrap">
      <div className="pp-cal-nav">
        <button type="button" className="pp-cal-nav-btn" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <h2 className="pp-cal-title">{monthName}</h2>
        <button type="button" className="pp-cal-nav-btn" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="pp-cal-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="pp-cal-day-label">{d}</div>
        ))}
        {Array.from({ length: firstDay }, (_, i) => <div key={`blank-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dayTasks = tasksByDay[day] ?? [];
          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();
          return (
            <div key={day} className={`pp-cal-cell${isToday ? ' today' : ''}${dayTasks.length ? ' has-tasks' : ''}`}>
              <div className="pp-cal-day-row">
                <span className={`pp-cal-day-num${isToday ? ' today-num' : ''}`}>{day}</span>
                {dayTasks.length > 0 && <span className="pp-cal-dot" title={`${dayTasks.length} task(s)`} />}
              </div>
              {dayTasks.slice(0, 2).map((t) => {
                const ps = PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.low;
                return (
                  <div
                    key={t.id}
                    className="pp-cal-task"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskClick(t.id);
                    }}
                    style={
                      {
                        borderLeftColor: ps.stripe,
                        background: ps.bg,
                        color: ps.color,
                      } as CSSProperties
                    }
                  >
                    {t.title}
                  </div>
                );
              })}
              {dayTasks.length > 2 && <span className="pp-cal-more">+{dayTasks.length - 2} more</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Overview View                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
function OverviewView({ tasks }: { tasks: ApiTask[] }) {
  const byStatus = [
    { name: 'Done', count: tasks.filter((t) => t.status === 'done').length },
    { name: 'In Progress', count: tasks.filter((t) => t.status === 'in_progress').length },
    { name: 'To Do', count: tasks.filter((t) => t.status === 'todo').length },
    /* Fix 5: due_date ?? undefined to satisfy isOverdue's param type */
    { name: 'Overdue', count: tasks.filter((t) => isOverdue(t.due_date ?? undefined)).length },
  ];
  const byPriority = [
    { name: 'Urgent', count: tasks.filter((t) => t.priority === 'urgent').length, color: '#dc2626' },
    { name: 'High', count: tasks.filter((t) => t.priority === 'high').length, color: '#ea580c' },
    { name: 'Medium', count: tasks.filter((t) => t.priority === 'medium').length, color: '#2563eb' },
    { name: 'Low', count: tasks.filter((t) => t.priority === 'low').length, color: '#64748b' },
  ];

  return (
    <div className="pp-overview-wrap">
      <div className="pp-overview-charts">
        <div className="pp-chart-card">
          <h3 className="pp-chart-title">Status Breakdown</h3>
          <div className="pp-pie-row">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={byStatus} dataKey="count" cx="50%" cy="50%" innerRadius={35} outerRadius={55} strokeWidth={0}>
                  {byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pp-pie-legend">
              {byStatus.map((s, i) => (
                <div key={s.name} className="pp-legend-item">
                  <span className="pp-legend-dot" style={{ background: PIE_COLORS[i] }} />
                  <span className="pp-legend-name">{s.name}</span>
                  <span className="pp-legend-val">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pp-chart-card">
          <h3 className="pp-chart-title">Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={byPriority} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--pp-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--pp-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--pp-surface)', border: '1px solid var(--pp-border2)', borderRadius: 8, fontSize: 12 }} cursor={false} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {byPriority.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fix 6: No CSS custom props (--tile-color) on JSX elements — use borderTopColor + color inline */}
      <div className="pp-summary-tiles">
        {byStatus.map((s, i) => (
          <div key={s.name} className="pp-summary-tile"
            style={{ borderTopColor: PIE_COLORS[i] } as CSSProperties}>
            <span className="pp-tile-val" style={{ color: PIE_COLORS[i] } as CSSProperties}>
              {s.count}
            </span>
            <span className="pp-tile-label">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Space+Mono:wght@400;700&display=swap');

.pp-root {
  --pp-font:      'Inter', sans-serif;
  --pp-mono:      'Space Mono', monospace;
  --pp-bg:        #000000;
  --pp-surface:   #0a0a0a;
  --pp-elev:      #111111;
  --pp-overlay:   #161616;
  --pp-txt:       #ffffff;
  --pp-txt2:      #a3a3a3;
  --pp-muted:     #525252;
  --pp-border:    rgba(255,255,255,0.06);
  --pp-border2:   rgba(255,255,255,0.10);
  --pp-border3:   rgba(255,255,255,0.20);
  --pp-accent:    #3b82f6;
  --pp-acc-soft:  rgba(59,130,246,0.12);
  --pp-radius:    0px;
  --pp-radius-sm: 0px;
  --pp-shadow:    0 1px 4px rgba(0,0,0,0.6);
  --pp-shadow-md: 0 4px 16px rgba(0,0,0,0.6);
  --pp-glow:      0 0 0 1px rgba(59,130,246,0.4);
  --pp-t:         150ms cubic-bezier(.4,0,.2,1);
  display: flex; flex-direction: column;
  height: 100%; overflow: hidden;
  font-family: var(--pp-font);
  background: var(--pp-bg); color: var(--pp-txt);
  position: relative;
}
.pp-loader { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; color: var(--pp-muted); font-family: var(--pp-mono); }
.pp-spin { animation: pp-spin 1s linear infinite; }
@keyframes pp-spin { to { transform: rotate(360deg); } }
.pp-view-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 0 20px; background: var(--pp-surface);
  border-bottom: 1px solid var(--pp-border); flex-shrink: 0;
}
.pp-view-tabs { display: flex; flex: 1; min-width: 0; overflow-x: auto; border-bottom: none; gap: 0; }
.pp-view-tab {
  display: flex; align-items: center; gap: 5px; padding: 12px 14px;
  background: transparent; border: none; border-bottom: 2px solid transparent;
  color: var(--pp-muted); font-size: 11px; font-weight: 700;
  font-family: var(--pp-mono); text-transform: uppercase; letter-spacing: 0.06em;
  cursor: pointer; transition: all var(--pp-t); white-space: nowrap; flex-shrink: 0;
  margin-bottom: -1px;
}
.pp-view-tab:hover { color: var(--pp-txt2); }
.pp-view-tab.active { color: var(--pp-accent); border-bottom-color: var(--pp-accent); }
.pp-add-task-bar-btn {
  display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px;
  background: var(--pp-accent); color: white; border: none;
  font-size: 11px; font-weight: 700;
  font-family: var(--pp-mono); text-transform: uppercase; letter-spacing: 0.06em;
  cursor: pointer; flex-shrink: 0; transition: all var(--pp-t);
}
.pp-add-task-bar-btn:hover { background: #2563eb; box-shadow: 0 0 20px rgba(59,130,246,0.4); }
.pp-content { flex: 1; overflow: hidden; min-height: 0; }
.pp-kanban-root { position: relative; height: 100%; display: flex; flex-direction: column; background: var(--pp-bg); }
.pp-kanban-loading {
  position: absolute; inset: 0; z-index: 2; display: flex; align-items: center; justify-content: center; gap: 6px;
  background: rgba(0,0,0,0.5);
}
.pp-kanban-columns { display: flex; gap: 10px; padding: 14px 18px; flex: 1; min-height: 0; overflow-x: auto; align-items: stretch; }
.pp-kanban-col {
  flex: 1; min-width: 240px; max-width: 420px; display: flex; flex-direction: column;
  background: var(--pp-surface); border: 1px solid var(--pp-border);
  overflow: hidden;
}
.pp-kanban-col-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 10px 12px; border-bottom: 1px solid var(--pp-border); background: var(--pp-elev); flex-shrink: 0;
}
.pp-kanban-col-title {
  font-size: 9px; font-weight: 700;
  font-family: var(--pp-mono);
  color: var(--pp-muted); letter-spacing: 0.1em; text-transform: uppercase;
}
.pp-kanban-col-count {
  font-size: 10px; font-weight: 700;
  font-family: var(--pp-mono);
  color: var(--pp-accent); background: var(--pp-acc-soft);
  padding: 2px 7px;
}
.pp-kanban-col-body { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.pp-kanban-empty {
  font-size: 10px; color: var(--pp-muted); text-align: center; padding: 20px 8px;
  font-family: var(--pp-mono); text-transform: uppercase; letter-spacing: 0.06em;
}
.pp-kanban-card {
  display: flex; overflow: hidden; background: var(--pp-elev);
  border: 1px solid var(--pp-border);
  cursor: pointer; transition: all var(--pp-t); outline: none;
}
.pp-kanban-card:hover { border-color: var(--pp-border2); background: var(--pp-overlay); }
.pp-kanban-card:focus-visible { outline: 1px solid var(--pp-accent); outline-offset: 2px; }
.pp-kanban-card-stripe { width: 3px; flex-shrink: 0; display: block; }
.pp-kanban-card-inner { flex: 1; padding: 10px 11px; display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.pp-kanban-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.pp-kanban-card-title { font-size: 12.5px; font-weight: 600; color: var(--pp-txt); line-height: 1.35; margin: 0; flex: 1; min-width: 0; letter-spacing: -0.01em; }
.pp-kanban-pri { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 6px; font-family: var(--pp-mono); flex-shrink: 0; }
.pp-kanban-due { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; font-family: var(--pp-mono); color: var(--pp-muted); }
.pp-kanban-due.overdue { color: #ef4444; }
.pp-kanban-card-foot { padding-top: 6px; border-top: 1px solid var(--pp-border); }
.pp-kanban-avatars .pp-avatar { width: 20px; height: 20px; font-size: 9px; }
.pp-avatar-stack { display: flex; }
.pp-avatar { width: 22px; height: 22px; background: var(--pp-acc-soft); color: var(--pp-accent); font-size: 9px; font-weight: 700; font-family: var(--pp-mono); display: flex; align-items: center; justify-content: center; border: 1px solid var(--pp-surface); margin-left: -5px; overflow: hidden; flex-shrink: 0; }
.pp-avatar:first-child { margin-left: 0; }
.pp-avatar img { width: 100%; height: 100%; object-fit: cover; }
.pp-avatar-overflow { background: var(--pp-overlay); color: var(--pp-muted); font-size: 8px; }
.pp-cal-wrap { height: 100%; overflow-y: auto; padding: 20px; background: var(--pp-bg); }
.pp-cal-nav { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px; }
.pp-cal-nav-btn {
  width: 36px; height: 36px; border-radius: var(--pp-radius-sm); border: 1px solid var(--pp-border2);
  background: var(--pp-surface); color: var(--pp-txt2); cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all var(--pp-t);
}
.pp-cal-nav-btn:hover { border-color: var(--pp-accent); color: var(--pp-accent); background: var(--pp-acc-soft); }
.pp-cal-title { font-size: 16px; font-weight: 800; color: var(--pp-txt); margin: 0; flex: 1; text-align: center; }
.pp-cal-day-row { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 4px; }
.pp-cal-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pp-accent); flex-shrink: 0; opacity: 0.85; }
.pp-cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; }
.pp-cal-day-label { padding: 6px 8px; font-size: 11px; font-weight: 700; color: var(--pp-muted); text-align: center; text-transform: uppercase; letter-spacing: 0.05em; }
.pp-cal-cell { min-height: 80px; padding: 6px 7px; background: var(--pp-surface); border: 1px solid var(--pp-border); border-radius: var(--pp-radius-sm); }
.pp-cal-cell.today { border-color: var(--pp-accent); }
.pp-cal-day-num { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; font-size: 12px; font-weight: 500; color: var(--pp-txt2); margin-bottom: 4px; }
.pp-cal-day-num.today-num { background: var(--pp-accent); color: white; font-weight: 800; }
.pp-cal-task { padding: 2px 5px; border-radius: 3px; border-left: 2px solid transparent; font-size: 10.5px; font-weight: 500; cursor: pointer; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-bottom: 2px; transition: opacity var(--pp-t); }
.pp-cal-task:hover { opacity: 0.8; }
.pp-cal-more { font-size: 10px; color: var(--pp-muted); display: block; margin-top: 2px; }
.pp-overview-wrap { height: 100%; overflow-y: auto; padding: 20px; background: var(--pp-bg); }
.pp-overview-charts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.pp-chart-card { background: var(--pp-surface); border: 1px solid var(--pp-border); border-radius: var(--pp-radius); padding: 18px; box-shadow: var(--pp-shadow); }
.pp-chart-title { font-size: 13px; font-weight: 700; color: var(--pp-txt); margin-bottom: 14px; }
.pp-pie-row { display: flex; align-items: center; gap: 20px; }
.pp-pie-legend { display: flex; flex-direction: column; gap: 8px; }
.pp-legend-item { display: flex; align-items: center; gap: 7px; }
.pp-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: block; }
.pp-legend-name { font-size: 12px; color: var(--pp-txt2); flex: 1; }
.pp-legend-val   { font-size: 12px; font-weight: 700; color: var(--pp-txt); }
.pp-summary-tiles { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
.pp-summary-tile { background: var(--pp-surface); border: 1px solid var(--pp-border); border-top: 3px solid transparent; border-radius: var(--pp-radius); padding: 16px; display: flex; flex-direction: column; gap: 4px; box-shadow: var(--pp-shadow); transition: transform var(--pp-t),box-shadow var(--pp-t); }
.pp-summary-tile:hover { transform: translateY(-2px); box-shadow: var(--pp-shadow-md); }
.pp-tile-val { font-size: 26px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; font-family: var(--pp-font); }
.pp-tile-label { font-size: 11.5px; color: var(--pp-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
.pp-modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; }
.pp-modal { background: var(--pp-surface); border: 1px solid var(--pp-border2); border-radius: 14px; width: 480px; max-width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }
.pp-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--pp-border); position: sticky; top: 0; background: var(--pp-surface); z-index: 1; }
.pp-modal-title-row { display: flex; align-items: center; gap: 10px; }
.pp-modal-icon { width: 32px; height: 32px; border-radius: var(--pp-radius-sm); background: var(--pp-acc-soft); color: var(--pp-accent); display: flex; align-items: center; justify-content: center; }
.pp-modal-title { font-size: 15px; font-weight: 700; color: var(--pp-txt); margin: 0; }
.pp-modal-close { width: 30px; height: 30px; border-radius: var(--pp-radius-sm); background: transparent; border: none; color: var(--pp-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all var(--pp-t); }
.pp-modal-close:hover { background: var(--pp-overlay); color: var(--pp-txt); }
.pp-modal-form { display: flex; flex-direction: column; gap: 18px; padding: 22px; }
.pp-field { display: flex; flex-direction: column; gap: 6px; }
.pp-field-row { display: flex; gap: 12px; }
.pp-label { font-size: 11.5px; font-weight: 700; color: var(--pp-txt2); text-transform: uppercase; letter-spacing: 0.07em; }
.pp-input { background: var(--pp-elev); border: 1.5px solid var(--pp-border2); border-radius: var(--pp-radius-sm); color: var(--pp-txt); font-family: var(--pp-font); font-size: 14px; font-weight: 500; padding: 11px 13px; outline: none; width: 100%; transition: border-color var(--pp-t),box-shadow var(--pp-t); -webkit-appearance: none; }
.pp-input::placeholder { color: var(--pp-muted); font-weight: 400; }
.pp-input:focus { border-color: var(--pp-accent); box-shadow: var(--pp-glow); background: var(--pp-surface); }
.pp-input:hover:not(:focus) { border-color: var(--pp-border3); }
.pp-textarea { resize: vertical; min-height: 72px; }
.pp-select { background: var(--pp-elev); border: 1.5px solid var(--pp-border2); border-radius: var(--pp-radius-sm); color: var(--pp-txt); font-family: var(--pp-font); font-size: 13.5px; font-weight: 500; padding: 11px 28px 11px 12px; outline: none; cursor: pointer; width: 100%; -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; transition: border-color var(--pp-t); }
.pp-select:focus { border-color: var(--pp-accent); box-shadow: var(--pp-glow); }
.pp-assignee-row { display: flex; gap: 8px; }
.pp-add-btn { width: 42px; height: 42px; flex-shrink: 0; background: var(--pp-elev); border: 1.5px solid var(--pp-border2); border-radius: var(--pp-radius-sm); color: var(--pp-txt2); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all var(--pp-t); }
.pp-add-btn:hover:not(:disabled) { background: var(--pp-acc-soft); border-color: var(--pp-accent); color: var(--pp-accent); }
.pp-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pp-assignee-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.pp-chip { display: inline-flex; align-items: center; gap: 5px; background: var(--pp-acc-soft); color: var(--pp-accent); border-radius: 99px; padding: 4px 10px; font-size: 12px; font-weight: 600; }
.pp-chip-remove { background: none; border: none; cursor: pointer; color: inherit; display: flex; padding: 0; opacity: 0.7; transition: opacity var(--pp-t); }
.pp-chip-remove:hover { opacity: 1; }
.pp-field-err  { font-size: 12px; color: #dc2626; font-weight: 600; }
.pp-field-hint { font-size: 12px; color: var(--pp-muted); }
.pp-modal-actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 4px; }
.pp-cancel-btn { padding: 10px 18px; background: var(--pp-elev); border: 1px solid var(--pp-border2); border-radius: var(--pp-radius-sm); color: var(--pp-txt2); font-size: 13.5px; font-weight: 600; font-family: var(--pp-font); cursor: pointer; transition: all var(--pp-t); }
.pp-cancel-btn:hover { background: var(--pp-overlay); border-color: var(--pp-border3); }
.pp-submit-btn { display: flex; align-items: center; gap: 7px; padding: 10px 20px; background: var(--pp-accent); color: white; border: none; border-radius: var(--pp-radius-sm); font-size: 13.5px; font-weight: 700; font-family: var(--pp-font); cursor: pointer; transition: all var(--pp-t); }
.pp-submit-btn:hover:not(:disabled) { background: #1d4ed8; box-shadow: 0 3px 12px rgba(37,99,235,0.30); }
.pp-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pp-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: pp-spin 0.65s linear infinite; }
@media (max-width: 768px) { .pp-overview-charts{grid-template-columns:1fr} .pp-summary-tiles{grid-template-columns:repeat(2,1fr)} .pp-field-row{flex-direction:column} .pp-kanban-columns{flex-direction:column; align-items:stretch} .pp-kanban-col{max-width:none; min-width:0} }
@media (max-width: 480px) { .pp-modal{border-radius:12px} .pp-modal-form{padding:16px} .pp-summary-tiles{grid-template-columns:repeat(2,1fr);gap:8px} .pp-input,.pp-select{font-size:16px} }
`;