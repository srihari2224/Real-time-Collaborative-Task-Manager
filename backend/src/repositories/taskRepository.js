// src/repositories/taskRepository.js

import { query } from '../config/database.js';

export const create = async ({ project_id, title, description, status, priority, assignee_id, created_by, due_date }) => {
  const { rows } = await query(
    `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [project_id, title, description, status || 'todo', priority || 'medium', assignee_id, created_by, due_date]
  );
  return rows[0];
};

export const findById = async (id) => {
  const { rows } = await query(
    `SELECT t.*,
            a.full_name as assignee_name, a.email as assignee_email, a.avatar_url as assignee_avatar,
            c.full_name as created_by_name
     FROM tasks t
     LEFT JOIN users a ON a.id = t.assignee_id
     JOIN users c ON c.id = t.created_by
     WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
};

export const findByProject = async (projectId, { status, priority, assignee_id, limit = 50, offset = 0 } = {}) => {
  const conditions = ['t.project_id = $1'];
  const params = [projectId];
  let idx = 2;

  if (status) { conditions.push(`t.status = $${idx++}`); params.push(status); }
  if (priority) { conditions.push(`t.priority = $${idx++}`); params.push(priority); }
  if (assignee_id) { conditions.push(`t.assignee_id = $${idx++}`); params.push(assignee_id); }

  params.push(limit, offset);

  const { rows } = await query(
    `SELECT t.*,
            a.full_name as assignee_name, a.avatar_url as assignee_avatar,
            c.full_name as created_by_name,
            COUNT(tc.id)::int as comment_count,
            COUNT(att.id)::int as attachment_count
     FROM tasks t
     LEFT JOIN users a ON a.id = t.assignee_id
     JOIN users c ON c.id = t.created_by
     LEFT JOIN task_comments tc ON tc.task_id = t.id
     LEFT JOIN attachments att ON att.task_id = t.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY t.id, a.full_name, a.avatar_url, c.full_name
     ORDER BY t.position ASC, t.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );
  return rows;
};

export const countByProject = async (projectId, filters = {}) => {
  const conditions = ['project_id = $1'];
  const params = [projectId];
  let idx = 2;

  if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
  if (filters.priority) { conditions.push(`priority = $${idx++}`); params.push(filters.priority); }
  if (filters.assignee_id) { conditions.push(`assignee_id = $${idx++}`); params.push(filters.assignee_id); }

  const { rows } = await query(
    `SELECT COUNT(*)::int as total FROM tasks WHERE ${conditions.join(' AND ')}`,
    params
  );
  return rows[0].total;
};

export const update = async (id, { title, description, status, priority, assignee_id, due_date, position }) => {
  const { rows } = await query(
    `UPDATE tasks SET
       title       = COALESCE($2, title),
       description = COALESCE($3, description),
       status      = COALESCE($4, status),
       priority    = COALESCE($5, priority),
       assignee_id = COALESCE($6, assignee_id),
       due_date    = COALESCE($7, due_date),
       position    = COALESCE($8, position),
       updated_at  = NOW()
     WHERE id = $1 RETURNING *`,
    [id, title, description, status, priority, assignee_id, due_date, position]
  );
  return rows[0];
};

export const remove = async (id) => {
  await query('DELETE FROM tasks WHERE id = $1', [id]);
};
