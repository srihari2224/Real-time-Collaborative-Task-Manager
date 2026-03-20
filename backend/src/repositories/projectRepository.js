// src/repositories/projectRepository.js

import { query } from '../config/database.js';

export const create = async ({ workspace_id, name, description, color, created_by }) => {
  const { rows } = await query(
    `INSERT INTO projects (workspace_id, name, description, color, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [workspace_id, name, description, color || '#6366f1', created_by]
  );
  return rows[0];
};

export const findById = async (id) => {
  const { rows } = await query(
    `SELECT p.*, u.full_name as created_by_name
     FROM projects p
     JOIN users u ON u.id = p.created_by
     WHERE p.id = $1`,
    [id]
  );
  return rows[0] || null;
};

export const findByWorkspace = async (workspaceId) => {
  const { rows } = await query(
    `SELECT p.*, u.full_name as created_by_name,
            COUNT(t.id)::int as task_count
     FROM projects p
     JOIN users u ON u.id = p.created_by
     LEFT JOIN tasks t ON t.project_id = p.id
     WHERE p.workspace_id = $1
     GROUP BY p.id, u.full_name
     ORDER BY p.created_at DESC`,
    [workspaceId]
  );
  return rows;
};

export const update = async (id, { name, description, color }) => {
  const { rows } = await query(
    `UPDATE projects SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       color = COALESCE($4, color),
       updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, name, description, color]
  );
  return rows[0];
};

export const remove = async (id) => {
  await query('DELETE FROM projects WHERE id = $1', [id]);
};
