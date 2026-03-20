// src/services/taskService.ts
import type { Task, TaskStatus, TaskPriority } from '../types/index.js';
import * as taskRepository from '../repositories/taskRepository.js';
import { parsePagination } from '../utils/pagination.js';

interface CreateTaskInput {
  project_id: string; title: string; description?: string;
  status?: TaskStatus; priority?: TaskPriority;
  assignee_id?: string | null; due_date?: Date | null;
}

export const createTask = async (userId: string, data: CreateTaskInput): Promise<Task> =>
  taskRepository.create({ ...data, created_by: userId });

export const getTask = async (id: string): Promise<Task> => {
  const task = await taskRepository.findById(id);
  if (!task) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
  return task;
};

export const listTasks = async (projectId: string, query: Record<string, unknown>) => {
  const { page, limit, offset } = parsePagination(query);
  const filters = { status: query.status as TaskStatus, priority: query.priority as TaskPriority, assignee_id: query.assignee_id as string };
  const [tasks, total] = await Promise.all([
    taskRepository.findByProject(projectId, { ...filters, limit, offset }),
    taskRepository.countByProject(projectId, filters),
  ]);
  return { tasks, pagination: { page, limit, total } };
};

export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
  const task = await taskRepository.update(id, updates);
  if (!task) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
  return task;
};

export const deleteTask = (id: string) => taskRepository.remove(id);
