// src/services/taskService.ts
import type { Task, TaskStatus, TaskPriority } from '../types/index.js';
import * as taskRepository from '../repositories/taskRepository.js';
import { parsePagination } from '../utils/pagination.js';
import { query } from '../config/database.js';

interface CreateTaskInput {
  project_id: string; title: string; description?: string;
  status?: TaskStatus; priority?: TaskPriority; due_date?: Date | null;
}

export const createTask = async (userId: string, data: CreateTaskInput): Promise<Task> =>
  taskRepository.create({ ...data, created_by: userId });

export const getTask = async (id: string) => {
  const task = await taskRepository.findById(id);
  if (!task) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
  return task;
};

export const listTasks = async (
  projectId: string,
  queryParams: Record<string, unknown> & { assignee_user_id?: string }
) => {
  const { page, limit, offset } = parsePagination(queryParams);
  const filters = {
    status: queryParams.status as TaskStatus,
    priority: queryParams.priority as TaskPriority,
    assignee_user_id: queryParams.assignee_user_id,
    limit,
    offset,
  };
  const [tasks, total] = await Promise.all([
    taskRepository.findByProject(projectId, filters),
    taskRepository.countByProject(projectId, filters),
  ]);
  return { tasks, pagination: { page, limit, total } };
};

export const listMyTasks = async (userId: string) => {
  return taskRepository.findByAssignee(userId);
};

export const updateTask = async (id: string, updates: Record<string, unknown>): Promise<Task> => {
  const task = await taskRepository.update(id, updates as any);
  if (!task) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
  return task;
};

export const deleteTask = (id: string) => taskRepository.remove(id);

/** Returns true if the given userId is owner/admin of the workspace that owns this project */
export const isOwnerOrAdminOfProject = async (projectId: string, userId: string): Promise<boolean> => {
  const { rows } = await query(
    `SELECT 1 FROM projects p
     JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $2
     WHERE p.id = $1 AND wm.role IN ('owner','admin')
     LIMIT 1`,
    [projectId, userId]
  );
  return rows.length > 0;
};

/** True if user is any member (any role) of the workspace that contains this project */
export const isMemberOfProjectWorkspace = async (projectId: string, userId: string): Promise<boolean> => {
  const { rows } = await query(
    `SELECT 1 FROM projects p
     JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $2
     WHERE p.id = $1
     LIMIT 1`,
    [projectId, userId]
  );
  return rows.length > 0;
};
