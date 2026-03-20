// src/services/taskService.js

import * as taskRepository from '../repositories/taskRepository.js';
import { parsePagination } from '../utils/pagination.js';

export const createTask = async (userId, { project_id, title, description, status, priority, assignee_id, due_date }) => {
  return taskRepository.create({ project_id, title, description, status, priority, assignee_id, created_by: userId, due_date });
};

export const getTask = async (id) => {
  const task = await taskRepository.findById(id);
  if (!task) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
  return task;
};

export const listTasks = async (projectId, query) => {
  const { page, limit, offset } = parsePagination(query);
  const filters = { status: query.status, priority: query.priority, assignee_id: query.assignee_id };
  const [tasks, total] = await Promise.all([
    taskRepository.findByProject(projectId, { ...filters, limit, offset }),
    taskRepository.countByProject(projectId, filters),
  ]);
  return { tasks, pagination: { page, limit, total } };
};

export const updateTask = async (id, updates) => {
  const task = await taskRepository.update(id, updates);
  if (!task) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
  return task;
};

export const deleteTask = async (id) => {
  await taskRepository.remove(id);
};
