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
}

export function KanbanBoard({ sections, tasks: initialTasks }: KanbanBoardProps) {
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

    // Dropped over a column (section)
    const overSection = sections.find((s) => s.id === over.id);
    if (overSection && activeTask.section_id !== overSection.id) {
      setTasks((prev) =>
        prev.map((t) => t.id === activeTask.id ? { ...t, section_id: overSection.id } : t)
      );
    }

    // Dropped over another task
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

    // Emit: task:moved via socket (demo — just toast)
    const fromSection = sections.find((s) => s.id === activeTask?.section_id);
    if (fromSection) {
      toast.success(`Moved to ${fromSection.name}`, { duration: 1500, id: 'task-moved' });
    }
  }, [tasks, sections]);

  const handleAddTask = (sectionId: string) => {
    toast('Click + Add task to create a new task', { icon: '📝' });
  };

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
            onAddTask={() => handleAddTask(section.id)}
          />
        ))}

        {/* Add a new column */}
        <button
          style={{
            width: 240,
            minWidth: 240,
            height: 46,
            border: '2px dashed var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all var(--transition)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
        >
          + New Section
        </button>
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
