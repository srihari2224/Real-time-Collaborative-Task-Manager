'use client';

import { Task } from '@/types';
import { formatDate, isOverdue, PRIORITY_CONFIG } from '@/lib/utils';
import { PresenceAvatars } from '@/components/ui/Avatar';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { MessageSquare, Calendar, CheckSquare } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
}

export function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const { openTaskPanel } = useUIStore();
  const completedSubtasks = task.subtasks.filter((s) => s.is_completed).length;
  const totalSubtasks = task.subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const overdue = isOverdue(task.due_date);
  const priorityColor = PRIORITY_CONFIG[task.priority].color;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging: dndIsDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: dndIsDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`task-card ${isDragging ? 'drag-overlay' : ''}`}
      style={{ borderLeftColor: priorityColor, ...style }}
      onClick={(e) => {
        e.stopPropagation();
        openTaskPanel(task.id);
      }}
    >
      {/* Labels */}
      {task.labels.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 7 }}>
          {task.labels.map((label) => (
            <span
              key={label.id}
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '1px 7px',
                borderRadius: 99,
                background: label.color + '18',
                color: label.color,
                border: `1px solid ${label.color}30`,
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 10 }} className="truncate-2">
        {task.title}
      </p>

      {/* Subtask progress */}
      {totalSubtasks > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <CheckSquare size={11} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{completedSubtasks}/{totalSubtasks}</span>
          </div>
          <ProgressBar value={subtaskProgress} />
        </div>
      )}

      {/* Footer row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <PriorityBadge priority={task.priority} showLabel={false} />

        {task.due_date && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 11,
            fontWeight: 500,
            color: overdue ? '#ef4444' : 'var(--text-muted)',
          }}>
            <Calendar size={10} />
            {formatDate(task.due_date)}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {task.unread_chat_count > 0 && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--accent)',
              background: 'var(--accent-soft)',
              borderRadius: 99,
              padding: '1px 6px',
              animation: 'badge-pulse 2s infinite',
            }}>
              <MessageSquare size={9} />
              {task.unread_chat_count}
            </span>
          )}

          {task.assignees.length > 0 && (
            <PresenceAvatars users={task.assignees} size={20} max={3} />
          )}
        </div>
      </div>
    </div>
  );
}
