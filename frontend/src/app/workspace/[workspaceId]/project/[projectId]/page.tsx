'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { Avatar, PresenceAvatars } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PROJECTS, SECTIONS, TASKS, USERS } from '@/data/seed';
import { ViewType } from '@/types';
import { useUIStore } from '@/stores/uiStore';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import {
  LayoutGrid, List, Calendar, BarChart2, Filter,
  Share2, ChevronDown, ChevronRight
} from 'lucide-react';
import { formatDate, isOverdue, PRIORITY_CONFIG } from '@/lib/utils';
import { Priority } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

const VIEW_TABS: { key: ViewType; label: string; icon: React.ReactNode }[] = [
  { key: 'kanban', label: 'Board', icon: <LayoutGrid size={13} /> },
  { key: 'list', label: 'List', icon: <List size={13} /> },
  { key: 'calendar', label: 'Calendar', icon: <Calendar size={13} /> },
  { key: 'overview', label: 'Overview', icon: <BarChart2 size={13} /> },
];

export default function ProjectPage() {
  const params = useParams();
  const { activeView, setActiveView, openTaskPanel } = useUIStore();
  const projectId = params?.projectId as string;

  const project = PROJECTS.find((p) => p.id === projectId) || PROJECTS[0];
  const projectSections = SECTIONS.filter((s) => s.project_id === project.id);
  const projectTasks = TASKS.filter((t) => t.project_id === project.id);

  const completedTasks = projectTasks.filter((t) => t.subtasks.length > 0 && t.subtasks.every((s) => s.is_completed)).length;
  const progressPct = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar
        title={project.name}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <PresenceAvatars users={USERS.slice(0, 3)} size={26} showPresence />
            <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }}>
              <Filter size={12} /> Filter
            </button>
            <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }}>
              <Share2 size={12} /> Share
            </button>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: '5px 10px' }}>
              + New Task
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
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>
            {completedTasks}/{projectTasks.length} done
          </span>
          <div style={{ flex: 1 }}>
            <ProgressBar value={progressPct} />
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
            {Math.round(progressPct)}%
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'hidden', padding: activeView === 'kanban' ? '16px 20px' : '0' }}>
        {activeView === 'kanban' && (
          <KanbanBoard sections={projectSections} tasks={projectTasks} />
        )}

        {activeView === 'list' && (
          <ListView sections={projectSections} tasks={projectTasks} onTaskClick={openTaskPanel} />
        )}

        {activeView === 'calendar' && (
          <CalendarView tasks={projectTasks} onTaskClick={openTaskPanel} />
        )}

        {activeView === 'overview' && (
          <OverviewView tasks={projectTasks} />
        )}
      </div>
    </div>
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
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 16px',
                          cursor: 'pointer',
                          borderBottom: i < secTasks.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                          transition: 'background var(--transition)',
                          borderLeft: `3px solid ${PRIORITY_CONFIG[task.priority as Priority].color}`,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: 16, height: 16, borderRadius: 3, border: '2px solid var(--border-strong)', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{task.title}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {task.due_date && (
                            <span style={{ fontSize: 11.5, color: isOverdue(task.due_date) ? '#ef4444' : 'var(--text-muted)', fontWeight: 500 }}>
                              {formatDate(task.due_date)}
                            </span>
                          )}
                          <PresenceAvatars users={task.assignees} size={20} />
                          {task.unread_chat_count > 0 && (
                            <span style={{ background: 'var(--accent)', color: 'white', borderRadius: 99, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
                              {task.unread_chat_count}
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
            <div key={day} style={{ minHeight: 80, padding: '6px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', position: 'relative' }}>
              <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? 'white' : 'var(--text-secondary)', background: isToday ? 'var(--accent)' : 'transparent', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {day}
              </span>
              {dayTasks.slice(0, 2).map((task: any) => (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task.id)}
                  style={{ marginTop: 3, padding: '1px 5px', borderRadius: 3, background: PRIORITY_CONFIG[task.priority as Priority].color + '20', borderLeft: `2px solid ${PRIORITY_CONFIG[task.priority as Priority].color}`, fontSize: 10.5, color: 'var(--text-primary)', cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: 500 }}
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

function OverviewView({ tasks }: { tasks: any[] }) {
  const byStatus = [
    { name: 'Done', count: tasks.filter((t) => t.subtasks.every((s: any) => s.is_completed) && t.subtasks.length > 0).length },
    { name: 'In Progress', count: tasks.filter((t) => t.subtasks.some((s: any) => s.is_completed) && !t.subtasks.every((s: any) => s.is_completed)).length },
    { name: 'Pending', count: tasks.filter((t) => t.subtasks.every((s: any) => !s.is_completed)).length },
    { name: 'Overdue', count: tasks.filter((t) => isOverdue(t.due_date)).length },
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
        {/* Status Pie */}
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

        {/* Priority Bar */}
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

      {/* Top Assignees */}
      <div className="card" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Top Assignees</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {USERS.slice(0, 4).map((user) => {
            const userTasks = tasks.filter((t) => t.assignees.some((a: any) => a.id === user.id));
            const pct = tasks.length > 0 ? (userTasks.length / tasks.length) * 100 : 0;
            return (
              <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar user={user} size={28} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{user.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{userTasks.length} tasks</span>
                  </div>
                  <ProgressBar value={pct} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
