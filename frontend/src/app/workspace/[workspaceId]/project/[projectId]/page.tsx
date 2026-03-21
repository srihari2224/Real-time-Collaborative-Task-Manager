'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ViewType } from '@/types';
import { useUIStore } from '@/stores/uiStore';
import { projectsApi, tasksApi, type ApiProject, type ApiTask } from '@/lib/apiClient';
import { AssigneePicker, type AssigneeInfo } from '@/components/ui/AssigneePicker';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import {
  LayoutGrid, List, Calendar, BarChart2, Filter,
  Share2, ChevronDown, ChevronRight, Plus, Loader2, X
} from 'lucide-react';
import { formatDate, isOverdue, PRIORITY_CONFIG } from '@/lib/utils';
import { Priority } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// Map backend status → Kanban section label
const STATUS_LABELS: Record<ApiTask['status'], string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  cancelled: 'Cancelled',
};

const STATUS_ORDER: ApiTask['status'][] = ['todo', 'in_progress', 'in_review', 'done'];

const VIEW_TABS: { key: ViewType; label: string; icon: React.ReactNode }[] = [
  { key: 'list', label: 'List', icon: <List size={13} /> },
  { key: 'calendar', label: 'Calendar', icon: <Calendar size={13} /> },
  { key: 'overview', label: 'Overview', icon: <BarChart2 size={13} /> },
];

export default function ProjectPage() {
  const params = useParams();
  const { activeView, setActiveView, openTaskPanel } = useUIStore();
  const projectId = params?.projectId as string;
  const workspaceId = params?.workspaceId as string;

  const [project, setProject] = useState<ApiProject | null>(null);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [proj, taskList] = await Promise.all([
        projectsApi.get(projectId),
        tasksApi.listByProject(projectId),
      ]);
      setProject(proj);
      setTasks(taskList);
    } catch {
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Socket: real-time task updates ──────────────────────────────────────
  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;
    let s: Awaited<ReturnType<typeof getSocket>> | null = null;

    getSocket().then((socket) => {
      if (!isMounted) return;
      s = socket;
      socket.emit(SOCKET_EVENTS.JOIN_WORKSPACE, workspaceId);

      socket.on(SOCKET_EVENTS.TASK_CREATED, (data: { task: ApiTask }) => {
        if (!isMounted) return;
        if (data.task.project_id === projectId) {
          setTasks((prev) => prev.some((t) => t.id === data.task.id) ? prev : [...prev, data.task]);
          toast.success(`New task: ${data.task.title}`, { duration: 2000, id: `task-created-${data.task.id}` });
        }
      });

      socket.on(SOCKET_EVENTS.TASK_UPDATED, (data: { task: ApiTask }) => {
        if (!isMounted) return;
        if (data.task.project_id === projectId) {
          setTasks((prev) => prev.map((t) => t.id === data.task.id ? data.task : t));
        }
      });

      socket.on(SOCKET_EVENTS.TASK_DELETED, (data: { taskId: string }) => {
        if (!isMounted) return;
        setTasks((prev) => prev.filter((t) => t.id !== data.taskId));
      });
    }).catch(() => {});

    return () => {
      isMounted = false;
      if (s) {
        s.emit(SOCKET_EVENTS.LEAVE_WORKSPACE, workspaceId);
        s.off(SOCKET_EVENTS.TASK_CREATED);
        s.off(SOCKET_EVENTS.TASK_UPDATED);
        s.off(SOCKET_EVENTS.TASK_DELETED);
      }
    };
  }, [workspaceId, projectId]);

  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const progressPct = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  // Build Kanban-compatible sections from task statuses
  const kanbanSections = STATUS_ORDER.map((status) => ({
    id: status,
    project_id: projectId,
    name: STATUS_LABELS[status],
    position: STATUS_ORDER.indexOf(status),
  }));

  // Map API tasks to the shape KanbanBoard expects
  const kanbanTasks = tasks.map((t) => ({
    ...t,
    section_id: t.status,
    assignees: (t.assignees ?? []).map((a) => ({ id: a.id, name: a.full_name ?? a.email, email: a.email, avatar_url: a.avatar_url, created_at: '' })),
    watchers: [], labels: [], subtasks: [], attachments: [], unread_chat_count: 0,
    created_by: t.created_by,
  }));

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar title="Loading..." />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading project...
        </div>
        <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar
        title={project?.name ?? 'Project'}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }}>
              <Filter size={12} /> Filter
            </button>
            <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }}>
              <Share2 size={12} /> Share
            </button>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => setShowNewTask(true)}>
              <Plus size={12} /> New Task
            </button>
          </div>
        }
      />

      {/* View Toggle & Progress */}
      <div style={{ padding: '0 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <div className="tab-bar" style={{ borderBottom: 'none' }}>
          {VIEW_TABS.map((v) => (
            <button
              key={v.key}
              onClick={() => setActiveView(v.key)}
              className={`tab-item ${activeView === v.key ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>{completedTasks}/{tasks.length} done</span>
          <div style={{ flex: 1 }}><ProgressBar value={progressPct} /></div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>{Math.round(progressPct)}%</span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'hidden', padding: activeView === 'kanban' ? '16px 20px' : '0' }}>
        {activeView === 'list' && (
          <ListView sections={kanbanSections} tasks={kanbanTasks as any} onTaskClick={openTaskPanel} />
        )}
        {activeView === 'calendar' && (
          <CalendarView tasks={kanbanTasks as any} onTaskClick={openTaskPanel} />
        )}
        {activeView === 'overview' && (
          <OverviewView tasks={tasks} />
        )}
      </div>

      {/* New Task Modal */}
      <AnimatePresence>
        {showNewTask && (
          <NewTaskModal
            projectId={projectId}
            onClose={() => setShowNewTask(false)}
            onCreated={(task) => { setTasks((prev) => [...prev, task]); setShowNewTask(false); }}
          />
        )}
      </AnimatePresence>

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── New Task Modal (multi-assignee) ──────────────────────────────────────────

function NewTaskModal({ projectId, onClose, onCreated }: {
  projectId: string;
  onClose: () => void;
  onCreated: (task: ApiTask) => void;
}) {
  const [title, setTitle]         = useState('');
  const [description, setDesc]    = useState('');
  const [priority, setPriority]   = useState<ApiTask['priority']>('medium');
  const [dueDate, setDueDate]     = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [assigneeEmails, setAssigneeEmails] = useState<string[]>([]);
  const [saving, setSaving]       = useState(false);

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!e || assigneeEmails.includes(e)) { setEmailInput(''); return; }
    setAssigneeEmails((prev) => [...prev, e]);
    setEmailInput('');
  };

  const removeEmail = (email: string) =>
    setAssigneeEmails((prev) => prev.filter((e) => e !== email));

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      // Resolve emails → user ids via workspace members list
      const task = await tasksApi.create({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        assigneeEmails,
      } as any);
      toast.success('Task created!');
      onCreated(task);
    } catch {
      toast.error('Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 24, width: 460, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>New Task</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Title */}
          <input autoFocus className="input" placeholder="Task title *" value={title} onChange={(e) => setTitle(e.target.value)} />

          {/* Description */}
          <textarea
            className="input" placeholder="Description (optional)" rows={2}
            value={description} onChange={(e) => setDesc(e.target.value)}
            style={{ resize: 'vertical', fontSize: 13 }}
          />

          {/* Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Priority</label>
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as any)} style={{ padding: '7px 10px', fontSize: 13 }}>
                <option value="low">🟢 Low</option>
                <option value="medium">🔵 Medium</option>
                <option value="high">🟠 High</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>
          </div>

          {/* Multi-Assignee — add by email */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Assignees</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="input" placeholder="Add by email..."
                value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                style={{ flex: 1, fontSize: 13 }}
              />
              <button type="button" className="btn btn-secondary" onClick={addEmail} style={{ flexShrink: 0, padding: '6px 12px' }}>
                <Plus size={13} />
              </button>
            </div>
            {assigneeEmails.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {assigneeEmails.map((email) => (
                  <div key={email} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 500 }}>
                    {email}
                    <button type="button" onClick={() => removeEmail(email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Assignees will be notified and can see this task</p>
          </div>

          {/* Due Date */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Due Date</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ padding: '7px 10px', fontSize: 13 }} />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
              {saving ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : 'Create Task'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ sections, tasks, onTaskClick }: any) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  return (
    <div className="scroll-y" style={{ height: '100%', padding: '16px 20px' }}>
      {sections.map((sec: any) => {
        const secTasks = tasks.filter((t: any) => t.section_id === sec.id);
        const isCollapsed = collapsed[sec.id];
        return (
          <div key={sec.id} style={{ marginBottom: 20 }}>
            <button
              onClick={() => setCollapsed((prev) => ({ ...prev, [sec.id]: !prev[sec.id] }))}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontFamily: 'var(--font-display)' }}
            >
              {isCollapsed ? <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />}
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{sec.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: 99, padding: '1px 7px', border: '1px solid var(--border-subtle)' }}>{secTasks.length}</span>
            </button>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    {secTasks.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>No tasks in this section</div>
                    ) : secTasks.map((task: any, i: number) => (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', borderBottom: i < secTasks.length - 1 ? '1px solid var(--border-subtle)' : 'none', transition: 'background var(--transition)', borderLeft: `3px solid ${PRIORITY_CONFIG[task.priority as Priority]?.color ?? '#6b7280'}` }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: 16, height: 16, borderRadius: 3, border: '2px solid var(--border-strong)', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{task.title}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {task.due_date && (
                            <span style={{ fontSize: 11.5, color: isOverdue(task.due_date ?? undefined) ? '#ef4444' : 'var(--text-muted)', fontWeight: 500 }}>
                              {formatDate(task.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({ tasks, onTaskClick }: any) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  const tasksByDay: Record<number, any[]> = {};
  tasks.forEach((task: any) => {
    if (task.due_date) {
      const d = new Date(task.due_date);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        if (!tasksByDay[day]) tasksByDay[day] = [];
        tasksByDay[day].push(task);
      }
    }
  });

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div className="scroll-y" style={{ height: '100%', padding: '20px' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>{monthName}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} style={{ padding: '6px 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
        ))}
        {blanks.map((b) => <div key={`blank-${b}`} />)}
        {days.map((day) => {
          const dayTasks = tasksByDay[day] || [];
          const isToday = day === today.getDate();
          return (
            <div key={day} style={{ minHeight: 80, padding: '6px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? 'white' : 'var(--text-secondary)', background: isToday ? 'var(--accent)' : 'transparent', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {day}
              </span>
              {dayTasks.slice(0, 2).map((task: any) => (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task.id)}
                  style={{ marginTop: 3, padding: '1px 5px', borderRadius: 3, background: (PRIORITY_CONFIG[task.priority as Priority]?.color ?? '#6b7280') + '20', borderLeft: `2px solid ${PRIORITY_CONFIG[task.priority as Priority]?.color ?? '#6b7280'}`, fontSize: 10.5, color: 'var(--text-primary)', cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: 500 }}
                >
                  {task.title}
                </div>
              ))}
              {dayTasks.length > 2 && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>+{dayTasks.length - 2} more</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

const PIE_COLORS = ['#22c55e', '#6366f1', '#f59e0b', '#ef4444'];

function OverviewView({ tasks }: { tasks: ApiTask[] }) {
  const byStatus = [
    { name: 'Done', count: tasks.filter((t) => t.status === 'done').length },
    { name: 'In Progress', count: tasks.filter((t) => t.status === 'in_progress').length },
    { name: 'To Do', count: tasks.filter((t) => t.status === 'todo').length },
    { name: 'Overdue', count: tasks.filter((t) => isOverdue(t.due_date ?? undefined)).length },
  ];

  const byPriority = [
    { name: 'Urgent', count: tasks.filter((t) => t.priority === 'urgent').length, color: '#ef4444' },
    { name: 'High', count: tasks.filter((t) => t.priority === 'high').length, color: '#f97316' },
    { name: 'Medium', count: tasks.filter((t) => t.priority === 'medium').length, color: '#3b82f6' },
    { name: 'Low', count: tasks.filter((t) => t.priority === 'low').length, color: '#6b7280' },
  ];

  return (
    <div className="scroll-y" style={{ height: '100%', padding: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: '18px' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Status Breakdown</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={byStatus} dataKey="count" cx="50%" cy="50%" innerRadius={35} outerRadius={55} strokeWidth={0}>
                  {byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {byStatus.map((s, i) => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i] }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 'auto', color: 'var(--text-primary)' }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '18px' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={byPriority} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" style={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis style={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 12, color: 'var(--text-primary)' }} cursor={false} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {byPriority.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Task Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {byStatus.map((s, i) => (
            <div key={s.name} style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: PIE_COLORS[i], letterSpacing: '-0.03em' }}>{s.count}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>{s.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
