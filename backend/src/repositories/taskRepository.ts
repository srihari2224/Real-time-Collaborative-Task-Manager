// src/repositories/taskRepository.ts
import { query } from '../config/database.js';
import type { Task, TaskStatus, TaskPriority } from '../types/index.js';

interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  limit?: number;
  offset?: number;
}

export const create = async (data: { project_id: string; title: string; description?: string; status?: TaskStatus; priority?: TaskPriority; assignee_id?: string | null; created_by: string; due_date?: Date | null }): Promise<Task> => {
  const { rows } = await query(
    `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [data.project_id, data.title, data.description ?? null, data.status ?? 'todo', data.priority ?? 'medium', data.assignee_id ?? null, data.created_by, data.due_date ?? null]
  );
  return rows[0] as Task;
};

export const findById = async (id: string): Promise<Task | null> => {
  const { rows } = await query(
    `SELECT t.*, a.full_name as assignee_name, a.email as assignee_email, a.avatar_url as assignee_avatar, c.full_name as created_by_name
     FROM tasks t LEFT JOIN users a ON a.id = t.assignee_id JOIN users c ON c.id = t.created_by WHERE t.id = $1`,
    [id]
  );
  return (rows[0] as Task) ?? null;
};

export const findByProject = async (projectId: string, filters: TaskFilters = {}): Promise<Task[]> => {
  const conditions = ['t.project_id = $1'];
  const params: unknown[] = [projectId];
  let idx = 2;
  if (filters.status)      { conditions.push(`t.status = $${idx++}`);      params.push(filters.status); }
  if (filters.priority)    { conditions.push(`t.priority = $${idx++}`);    params.push(filters.priority); }
  if (filters.assignee_id) { conditions.push(`t.assignee_id = $${idx++}`); params.push(filters.assignee_id); }
  params.push(filters.limit ?? 50, filters.offset ?? 0);
  const { rows } = await query(
    `SELECT t.*, a.full_name as assignee_name, a.avatar_url as assignee_avatar, c.full_name as created_by_name,
            COUNT(tc.id)::int as comment_count, COUNT(att.id)::int as attachment_count
     FROM tasks t LEFT JOIN users a ON a.id = t.assignee_id JOIN users c ON c.id = t.created_by
     LEFT JOIN task_comments tc ON tc.task_id = t.id LEFT JOIN attachments att ON att.task_id = t.id
     WHERE ${conditions.join(' AND ')} GROUP BY t.id, a.full_name, a.avatar_url, c.full_name
     ORDER BY t.position ASC, t.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );
  return rows as Task[];
};

export const countByProject = async (projectId: string, filters: Omit<TaskFilters, 'limit' | 'offset'> = {}): Promise<number> => {
  const conditions = ['project_id = $1'];
  const params: unknown[] = [projectId];
  let idx = 2;
  if (filters.status)      { conditions.push(`status = $${idx++}`);      params.push(filters.status); }
  if (filters.priority)    { conditions.push(`priority = $${idx++}`);    params.push(filters.priority); }
  if (filters.assignee_id) { conditions.push(`assignee_id = $${idx++}`); params.push(filters.assignee_id); }
  const { rows } = await query(`SELECT COUNT(*)::int as total FROM tasks WHERE ${conditions.join(' AND ')}`, params);
  return (rows[0] as { total: number }).total;
};

export const update = async (id: string, data: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'assignee_id' | 'due_date' | 'position'>>): Promise<Task> => {
  const { rows } = await query(
    `UPDATE tasks SET title = COALESCE($2, title), description = COALESCE($3, description), status = COALESCE($4, status),
     priority = COALESCE($5, priority), assignee_id = COALESCE($6, assignee_id), due_date = COALESCE($7, due_date),
     position = COALESCE($8, position), updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, data.title ?? null, data.description ?? null, data.status ?? null, data.priority ?? null, data.assignee_id ?? null, data.due_date ?? null, data.position ?? null]
  );
  return rows[0] as Task;
};

export const remove = async (id: string): Promise<void> => {
  await query('DELETE FROM tasks WHERE id = $1', [id]);
};

// Returns the workspace_id for a given task via tasks → projects join
export const findWorkspaceIdByTaskId = async (taskId: string): Promise<string | null> => {
  const { rows } = await query(
    `SELECT p.workspace_id FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = $1 LIMIT 1`,
    [taskId]
  );
  return (rows[0] as { workspace_id: string } | undefined)?.workspace_id ?? null;
};

// Returns the workspace_id for a given project
export const findWorkspaceIdByProjectId = async (projectId: string): Promise<string | null> => {
  const { rows } = await query(
    `SELECT workspace_id FROM projects WHERE id = $1 LIMIT 1`,
    [projectId]
  );
  return (rows[0] as { workspace_id: string } | undefined)?.workspace_id ?? null;
};
