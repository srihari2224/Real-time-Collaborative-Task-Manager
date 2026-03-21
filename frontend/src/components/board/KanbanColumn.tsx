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
      className={`kanban-column ${isOver ? 'is-over' : ''}`}
      style={{ transition: 'border-color 150ms ease, background 150ms ease' }}
    >
      {/* Header */}
      <div className="kanban-column-header">
        <div className="kanban-column-title-row">
          <span className="kanban-column-name">{section.name}</span>
          <span className="kanban-column-count">{tasks.length}</span>
        </div>
        <button className="kanban-menu-btn">
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Task list */}
      <div ref={setNodeRef} className="kanban-column-body">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className={`kanban-empty-drop ${isOver ? 'over' : ''}`}>
              Drop tasks here
            </div>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </SortableContext>
      </div>

      {/* Add task */}
      <div className="kanban-column-footer">
        <button className="kanban-add-task-btn" onClick={onAddTask}>
          <Plus size={13} />
          Add task
        </button>
      </div>

      <style jsx>{`
        .kanban-column {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          width: 272px;
          min-width: 272px;
          max-height: calc(100vh - 120px);
          overflow: hidden;
          flex-shrink: 0;
        }
        .kanban-column.is-over {
          border-color: var(--accent);
          background: rgba(37,99,235,0.03);
        }

        .kanban-column-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px 10px;
          flex-shrink: 0;
          border-bottom: 1px solid var(--border-subtle);
        }

        .kanban-column-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .kanban-column-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .kanban-column-count {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          background: var(--bg-overlay);
          border-radius: 99px;
          padding: 1px 8px;
          border: 1px solid var(--border-subtle);
          font-variant-numeric: tabular-nums;
        }

        .kanban-menu-btn {
          width: 26px;
          height: 26px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition);
          opacity: 0;
        }
        .kanban-column-header:hover .kanban-menu-btn { opacity: 1; }
        .kanban-menu-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .kanban-column-body {
          flex: 1;
          overflow-y: auto;
          padding: 10px 10px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .kanban-column-body::-webkit-scrollbar { width: 4px; }
        .kanban-column-body::-webkit-scrollbar-track { background: transparent; }
        .kanban-column-body::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 99px; }

        .kanban-empty-drop {
          border: 2px dashed var(--border-subtle);
          border-radius: var(--radius);
          padding: 20px 16px;
          text-align: center;
          font-size: 12px;
          color: var(--text-muted);
          transition: all 150ms ease;
          font-weight: 500;
        }
        .kanban-empty-drop.over {
          border-color: var(--accent);
          background: rgba(37,99,235,0.05);
          color: var(--accent);
        }

        .kanban-column-footer {
          padding: 8px 10px 10px;
          flex-shrink: 0;
          border-top: 1px solid var(--border-subtle);
        }

        .kanban-add-task-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          padding: 6px 8px;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer;
          font-size: 12.5px;
          font-family: var(--font-display);
          font-weight: 600;
          transition: all var(--transition);
          letter-spacing: -0.01em;
        }
        .kanban-add-task-btn:hover {
          background: var(--bg-hover);
          color: var(--accent);
        }
      `}</style>
    </div>
  );
}