'use client';

import { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { TASKS, CURRENT_USER } from '@/data/seed';
import { Avatar } from '@/components/ui/Avatar';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { formatDate, isOverdue, isDueToday, isDueThisWeek } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { MessageSquare, Calendar, CheckSquare, AlertTriangle } from 'lucide-react';

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

interface GroupedSection {
  key: string;
  label: string;
  color: string;
  tasks: typeof TASKS;
}

export default function MyTasksPage() {
  const { openTaskPanel } = useUIStore();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  // Filter to tasks assigned to current user
  const myTasks = TASKS.filter((t) => t.assignees.some((a) => a.id === CURRENT_USER.id));

  const overdue = myTasks.filter((t) => isOverdue(t.due_date) && !completedIds.has(t.id));
  const dueToday = myTasks.filter((t) => isDueToday(t.due_date) && !completedIds.has(t.id));
  const thisWeek = myTasks.filter((t) => isDueThisWeek(t.due_date) && !isOverdue(t.due_date) && !isDueToday(t.due_date) && !completedIds.has(t.id));
  const noDueDate = myTasks.filter((t) => !t.due_date && !completedIds.has(t.id));

  const sections: GroupedSection[] = [
    { key: 'overdue', label: 'Overdue', color: '#ef4444', tasks: overdue },
    { key: 'today', label: 'Due Today', color: 'var(--accent)', tasks: dueToday },
    { key: 'week', label: 'Due This Week', color: '#6366f1', tasks: thisWeek },
    { key: 'none', label: 'No Due Date', color: 'var(--text-muted)', tasks: noDueDate },
  ].filter((s) => s.tasks.length > 0);

  const toggleComplete = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      borderBottom: i < section.tasks.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      transition: 'background var(--transition)',
                      opacity: isComplete ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleComplete(task.id)}
                      style={{
                        width: 17,
                        height: 17,
                        borderRadius: 4,
                        border: `2px solid ${isComplete ? 'var(--accent)' : 'var(--border-strong)'}`,
                        background: isComplete ? 'var(--accent)' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all var(--transition)',
                      }}
                    >
                      {isComplete && <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>✓</span>}
                    </button>

                    {/* Task title */}
                    <span
                      onClick={() => openTaskPanel(task.id)}
                      style={{ flex: 1, fontSize: 13, fontWeight: 500, cursor: 'pointer', textDecoration: isComplete ? 'line-through' : 'none', color: isComplete ? 'var(--text-muted)' : 'var(--text-primary)' }}
                    >
                      {task.title}
                    </span>

                    {/* Meta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <PriorityBadge priority={task.priority} showLabel={false} />

                      {task.due_date && (
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: isOverdue(task.due_date) ? '#ef4444' : 'var(--text-muted)' }}>
                          {formatDate(task.due_date)}
                        </span>
                      )}

                      {task.subtasks.length > 0 && (
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <CheckSquare size={11} />
                          {task.subtasks.filter((s) => s.is_completed).length}/{task.subtasks.length}
                        </span>
                      )}

                      {task.unread_chat_count > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, color: 'var(--accent)', background: 'var(--accent-soft)', borderRadius: 99, padding: '1px 6px', fontWeight: 700 }}>
                          <MessageSquare size={10} /> {task.unread_chat_count}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {myTasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
            <CheckSquare size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>All caught up!</h3>
            <p style={{ fontSize: 13 }}>No tasks assigned to you.</p>
          </div>
        )}
      </div>
    </div>
  );
}
