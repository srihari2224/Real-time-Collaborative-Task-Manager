'use client';

import { useState, useCallback } from 'react';
import { Section, Task } from '@/types';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import toast from 'react-hot-toast';

interface KanbanBoardProps {
  sections: Section[];
  tasks: Task[];
  onStatusChange?: (taskId: string, newStatus: string) => void;
}

export function KanbanBoard({ sections, tasks: initialTasks, onStatusChange }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const getTasksForSection = (sectionId: string) =>
    tasks.filter((t) => t.section_id === sectionId);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }, [tasks]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overSection = sections.find((s) => s.id === over.id);
    if (overSection && activeTask.section_id !== overSection.id) {
      setTasks((prev) =>
        prev.map((t) => t.id === activeTask.id ? { ...t, section_id: overSection.id } : t)
      );
    }

    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask && overTask.id !== activeTask.id) {
      if (activeTask.section_id !== overTask.section_id) {
        setTasks((prev) =>
          prev.map((t) => t.id === activeTask.id ? { ...t, section_id: overTask.section_id } : t)
        );
      }
    }
  }, [tasks, sections]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;
    if (active.id === over.id) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    const overTask = tasks.find((t) => t.id === over.id);

    if (activeTask && overTask && activeTask.section_id === overTask.section_id) {
      const sectionTasks = getTasksForSection(activeTask.section_id);
      const oldIdx = sectionTasks.findIndex((t) => t.id === active.id);
      const newIdx = sectionTasks.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(sectionTasks, oldIdx, newIdx);

      setTasks((prev) => {
        const others = prev.filter((t) => t.section_id !== activeTask.section_id);
        return [...others, ...reordered];
      });
    }

    const movedTask = tasks.find((t) => t.id === active.id);
    const toSection = sections.find((s) => s.id === movedTask?.section_id);
    if (toSection) {
      toast.success(`Moved to ${toSection.name}`, { duration: 1500, id: 'task-moved' });
      if (onStatusChange && movedTask) {
        onStatusChange(movedTask.id, movedTask.section_id);
      }
    }
  }, [tasks, sections, onStatusChange]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        {sections.map((section) => (
          <KanbanColumn
            key={section.id}
            section={section}
            tasks={getTasksForSection(section.id)}
            onAddTask={() => toast('Click + Add task to create a new task', { icon: '📝' })}
          />
        ))}

        {/* Add new column */}
        <button className="kanban-new-section-btn">
          + New Section
        </button>
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isDragging />}
      </DragOverlay>

      <style jsx>{`
        .kanban-board {
          display: flex;
          gap: 14px;
          padding: 4px 2px 24px;
          overflow-x: auto;
          align-items: flex-start;
          min-height: 0;
          scrollbar-width: thin;
          scrollbar-color: var(--border-default) transparent;
        }
        .kanban-board::-webkit-scrollbar { height: 6px; }
        .kanban-board::-webkit-scrollbar-track { background: transparent; }
        .kanban-board::-webkit-scrollbar-thumb {
          background: var(--border-default);
          border-radius: 99px;
        }

        .kanban-new-section-btn {
          width: 256px;
          min-width: 256px;
          height: 44px;
          border: 2px dashed var(--border-default);
          border-radius: var(--radius-lg);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 13px;
          font-family: var(--font-display);
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all var(--transition);
          flex-shrink: 0;
          letter-spacing: -0.01em;
          align-self: flex-start;
          margin-top: 0;
        }
        .kanban-new-section-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: rgba(37,99,235,0.04);
        }
      `}</style>
    </DndContext>
  );
}