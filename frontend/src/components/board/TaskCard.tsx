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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: dndIsDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: dndIsDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style }}
      {...attributes}
      {...listeners}
      className={`task-card ${isDragging ? 'drag-overlay' : ''}`}
      data-priority={task.priority}
      onClick={(e) => {
        e.stopPropagation();
        openTaskPanel(task.id);
      }}
    >
      {/* Priority accent line */}
      <div
        className="task-card-accent"
        style={{ background: priorityColor }}
      />

      <div className="task-card-body">
        {/* Labels */}
        {task.labels.length > 0 && (
          <div className="task-labels">
            {task.labels.map((label) => (
              <span
                key={label.id}
                className="task-label"
                style={{
                  background: label.color + '18',
                  color: label.color,
                  border: `1px solid ${label.color}28`,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <p className="task-card-title truncate-2">{task.title}</p>

        {/* Subtask progress */}
        {totalSubtasks > 0 && (
          <div className="task-subtask-row">
            <div className="task-subtask-label">
              <CheckSquare size={10} style={{ color: 'var(--text-muted)' }} />
              <span>{completedSubtasks}/{totalSubtasks}</span>
            </div>
            <ProgressBar value={subtaskProgress} />
          </div>
        )}

        {/* Footer */}
        <div className="task-card-footer">
          <div className="task-card-footer-left">
            <PriorityBadge priority={task.priority} showLabel={false} />

            {task.due_date && (
              <span
                className="task-due-date"
                style={{ color: overdue ? '#ef4444' : 'var(--text-muted)' }}
              >
                <Calendar size={10} />
                {formatDate(task.due_date)}
              </span>
            )}
          </div>

          <div className="task-card-footer-right">
            {task.unread_chat_count > 0 && (
              <span className="task-msg-badge">
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

      <style jsx>{`
        .task-card {
          position: relative;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius);
          cursor: grab;
          transition: box-shadow var(--transition), border-color var(--transition), transform 120ms ease;
          overflow: hidden;
          display: flex;
        }
        .task-card:hover {
          border-color: var(--border-default);
          box-shadow: 0 4px 16px rgba(37,99,235,0.08), 0 1px 4px rgba(0,0,0,0.06);
          transform: translateY(-1px);
        }
        .task-card.drag-overlay {
          box-shadow: 0 12px 40px rgba(37,99,235,0.2), 0 4px 12px rgba(0,0,0,0.12);
          cursor: grabbing;
          transform: rotate(1.5deg) scale(1.02);
        }

        .task-card-accent {
          width: 3px;
          flex-shrink: 0;
          border-radius: 0;
        }

        .task-card-body {
          flex: 1;
          padding: 11px 12px 10px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .task-labels {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-bottom: 7px;
        }
        .task-label {
          font-size: 9.5px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 99px;
          letter-spacing: 0.03em;
        }

        .task-card-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.45;
          margin-bottom: 10px;
          letter-spacing: -0.01em;
        }

        .task-subtask-row {
          margin-bottom: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .task-subtask-label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10.5px;
          color: var(--text-muted);
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }

        .task-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }
        .task-card-footer-left {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .task-card-footer-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .task-due-date {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 10.5px;
          font-weight: 600;
        }

        .task-msg-badge {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          font-weight: 700;
          color: var(--accent);
          background: rgba(37,99,235,0.1);
          border-radius: 99px;
          padding: 2px 7px;
          border: 1px solid rgba(37,99,235,0.15);
          animation: badge-pulse 2s infinite;
        }
        @keyframes badge-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.3); }
          50% { box-shadow: 0 0 0 3px rgba(37,99,235,0); }
        }
      `}</style>
    </div>
  );
}