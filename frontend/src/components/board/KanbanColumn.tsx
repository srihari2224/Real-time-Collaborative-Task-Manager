'use client';

import { Section, Task } from '@/types';
import { TaskCard } from './TaskCard';
import { Plus, MoreHorizontal } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface KanbanColumnProps {
  section: Section;
  tasks: Task[];
  onAddTask?: () => void;
}

export function KanbanColumn({ section, tasks, onAddTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: section.id });

  return (
    <div
      className="kanban-column"
      style={{ borderColor: isOver ? 'var(--accent)' : 'var(--border-subtle)', transition: 'border-color 150ms ease' }}
    >
      {/* Header */}
      <div className="kanban-column-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{section.name}</span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            background: 'var(--bg-elevated)',
            borderRadius: 99,
            padding: '1px 7px',
            border: '1px solid var(--border-subtle)',
          }}>
            {tasks.length}
          </span>
        </div>
        <button
          style={{ width: 24, height: 24, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all var(--transition)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Task List */}
      <div ref={setNodeRef} className="kanban-column-body">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div style={{
              border: '2px dashed var(--border-subtle)',
              borderRadius: 'var(--radius)',
              padding: '20px',
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--text-muted)',
              transition: 'border-color 150ms',
              ...(isOver ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : {}),
            }}>
              Drop tasks here
            </div>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </SortableContext>
      </div>

      {/* Add Task Button */}
      <div style={{ padding: '8px 10px', flexShrink: 0, borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={onAddTask}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: '100%',
            padding: '6px 8px',
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 12.5,
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            transition: 'all var(--transition)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <Plus size={13} />
          Add task
        </button>
      </div>
    </div>
  );
}
