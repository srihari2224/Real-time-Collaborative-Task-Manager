// src/repositories/taskRepository.ts
import { query } from '../config/database.js';
import type { Task, TaskStatus, TaskPriority } from '../types/index.js';

interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_user_id?: string; // filter to only tasks this user is assigned to
  limit?: number;
  offset?: number;
}

// Full task row enriched with assignee list + counts
export interface RichTask extends Omit<Task, 'assignee_id'> {
  assignees: { id: string; email: string; full_name: string | null; avatar_url: string | null }[];
  comment_count: number;
  attachment_count: number;
  subtask_total: number;
  subtask_done: number;
}

export const create = async (data: {
  project_id: string; title: string; description?: string;
  status?: TaskStatus; priority?: TaskPriority; created_by: string; due_date?: Date | null;
}): Promise<Task> => {
  const { rows } = await query(
    `INSERT INTO tasks (project_id, title, description, status, priority, created_by, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [data.project_id, data.title, data.description ?? null,
     data.status ?? 'todo', data.priority ?? 'medium',
     data.created_by, data.due_date ?? null]
  );
  return rows[0] as Task;
};

export const addAssignee = async (taskId: string, userId: string): Promise<void> => {
  await query(
    'INSERT INTO task_assignees (task_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [taskId, userId]
  );
};

export const removeAssignee = async (taskId: string, userId: string): Promise<void> => {
  await query('DELETE FROM task_assignees WHERE task_id=$1 AND user_id=$2', [taskId, userId]);
};

export const setAssignees = async (taskId: string, userIds: string[]): Promise<void> => {
  await query('DELETE FROM task_assignees WHERE task_id = $1', [taskId]);
  for (const uid of userIds) {
    await query(
      'INSERT INTO task_assignees (task_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [taskId, uid]
    );
  }
};

export const getAssignees = async (taskId: string) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.full_name, u.avatar_url
     FROM task_assignees ta JOIN users u ON u.id = ta.user_id
     WHERE ta.task_id = $1`,
    [taskId]
  );
  return rows as { id: string; email: string; full_name: string | null; avatar_url: string | null }[];
};

export const findById = async (id: string): Promise<RichTask | null> => {
  const { rows } = await query(
    `SELECT t.*,
       c.full_name as created_by_name,
       COALESCE(cc.comment_count, 0)::int    as comment_count,
       COALESCE(ac.attachment_count, 0)::int as attachment_count,
       COALESCE(sc.total, 0)::int            as subtask_total,
       COALESCE(sc.done, 0)::int             as subtask_done
     FROM tasks t
     JOIN users c ON c.id = t.created_by
     LEFT JOIN (SELECT task_id, COUNT(*) AS comment_count FROM task_comments GROUP BY task_id) cc ON cc.task_id = t.id
     LEFT JOIN (SELECT task_id, COUNT(*) AS attachment_count FROM attachments GROUP BY task_id) ac ON ac.task_id = t.id
     LEFT JOIN (
       SELECT task_id,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE is_done) AS done
       FROM subtasks GROUP BY task_id
     ) sc ON sc.task_id = t.id
     WHERE t.id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const assignees = await getAssignees(id);
  return { ...rows[0], assignees } as RichTask;
};

export const findByProject = async (
  projectId: string,
  filters: TaskFilters = {}
): Promise<RichTask[]> => {
  const conditions = ['t.project_id = $1'];
  const params: unknown[] = [projectId];
  let idx = 2;

  if (filters.status)   { conditions.push(`t.status = $${idx++}`);   params.push(filters.status); }
  if (filters.priority) { conditions.push(`t.priority = $${idx++}`); params.push(filters.priority); }
  // Visibility: if assignee_user_id provided, only show tasks they are assigned to
  if (filters.assignee_user_id) {
    conditions.push(`EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $${idx++})`);
    params.push(filters.assignee_user_id);
  }

  params.push(filters.limit ?? 100, filters.offset ?? 0);
  const { rows } = await query(
    `SELECT t.*,
       c.full_name as created_by_name,
       COALESCE(cc.comment_count, 0)::int    as comment_count,
       COALESCE(ac.attachment_count, 0)::int as attachment_count,
       COALESCE(sc.total, 0)::int            as subtask_total,
       COALESCE(sc.done, 0)::int             as subtask_done
     FROM tasks t
     JOIN users c ON c.id = t.created_by
     LEFT JOIN (SELECT task_id, COUNT(*) AS comment_count FROM task_comments GROUP BY task_id) cc ON cc.task_id = t.id
     LEFT JOIN (SELECT task_id, COUNT(*) AS attachment_count FROM attachments GROUP BY task_id) ac ON ac.task_id = t.id
     LEFT JOIN (
       SELECT task_id,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE is_done) AS done
       FROM subtasks GROUP BY task_id
     ) sc ON sc.task_id = t.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY t.id, c.full_name, cc.comment_count, ac.attachment_count, sc.total, sc.done
     ORDER BY t.position ASC, t.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );

  // Batch-load all assignees for these tasks
  const taskIds = rows.map((r: any) => r.id);
  if (!taskIds.length) return [];
  const { rows: assigneeRows } = await query(
    `SELECT ta.task_id, u.id, u.email, u.full_name, u.avatar_url
     FROM task_assignees ta JOIN users u ON u.id = ta.user_id
     WHERE ta.task_id = ANY($1)`,
    [taskIds]
  );
  const assigneeMap: Record<string, any[]> = {};
  for (const ar of assigneeRows) {
    if (!assigneeMap[ar.task_id]) assigneeMap[ar.task_id] = [];
    assigneeMap[ar.task_id].push({ id: ar.id, email: ar.email, full_name: ar.full_name, avatar_url: ar.avatar_url });
  }
  return rows.map((r: any) => ({ ...r, assignees: assigneeMap[r.id] ?? [] })) as RichTask[];
};

export const countByProject = async (
  projectId: string,
  filters: Omit<TaskFilters, 'limit' | 'offset'> = {}
): Promise<number> => {
  const conditions = ['t.project_id = $1'];
  const params: unknown[] = [projectId];
  let idx = 2;
  if (filters.status)   { conditions.push(`t.status = $${idx++}`);   params.push(filters.status); }
  if (filters.priority) { conditions.push(`t.priority = $${idx++}`); params.push(filters.priority); }
  if (filters.assignee_user_id) {
    conditions.push(`EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $${idx++})`);
    params.push(filters.assignee_user_id);
  }
  const { rows } = await query(
    `SELECT COUNT(DISTINCT t.id)::int as total FROM tasks t WHERE ${conditions.join(' AND ')}`,
    params
  );
  return (rows[0] as { total: number }).total;
};

export const update = async (
  id: string,
  data: Partial<{ title: string; description: string; status: TaskStatus; priority: TaskPriority; due_date: Date | null; position: number }>
): Promise<Task> => {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (data.title !== undefined)       { sets.push(`title = $${i++}`);       vals.push(data.title); }
  if (data.description !== undefined) { sets.push(`description = $${i++}`); vals.push(data.description); }
  if (data.status !== undefined)      { sets.push(`status = $${i++}`);      vals.push(data.status); }
  if (data.priority !== undefined)    { sets.push(`priority = $${i++}`);    vals.push(data.priority); }
  if (data.due_date !== undefined)    { sets.push(`due_date = $${i++}`);    vals.push(data.due_date); }
  if (data.position !== undefined)    { sets.push(`position = $${i++}`);    vals.push(data.position); }
  sets.push('updated_at = NOW()');
  vals.push(id);
  const { rows } = await query(
    `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    vals
  );
  return rows[0] as Task;
};

export const remove = async (id: string): Promise<void> => {
  await query('DELETE FROM tasks WHERE id = $1', [id]);
};

export const findWorkspaceIdByTaskId = async (taskId: string): Promise<string | null> => {
  const { rows } = await query(
    `SELECT p.workspace_id FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = $1 LIMIT 1`,
    [taskId]
  );
  return (rows[0] as { workspace_id: string } | undefined)?.workspace_id ?? null;
};

export const findWorkspaceIdByProjectId = async (projectId: string): Promise<string | null> => {
  const { rows } = await query(
    `SELECT workspace_id FROM projects WHERE id = $1 LIMIT 1`,
    [projectId]
  );
  return (rows[0] as { workspace_id: string } | undefined)?.workspace_id ?? null;
};

/** Check if a user is the owner of the workspace that this task belongs to */
export const isProjectOwnerOrAdmin = async (taskId: string, userId: string): Promise<boolean> => {
  const { rows } = await query(
    `SELECT 1 FROM tasks t
     JOIN projects p ON p.id = t.project_id
     JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $2
     WHERE t.id = $1 AND wm.role IN ('owner','admin')
     LIMIT 1`,
    [taskId, userId]
  );
  return rows.length > 0;
};
