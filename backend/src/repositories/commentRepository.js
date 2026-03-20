// src/repositories/commentRepository.js

import { query } from '../config/database.js';

export const create = async ({ task_id, user_id, content }) => {
  const { rows } = await query(
    `INSERT INTO task_comments (task_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
    [task_id, user_id, content]
  );
  return rows[0];
};

export const findByTask = async (taskId) => {
  const { rows } = await query(
    `SELECT tc.*, u.full_name, u.email, u.avatar_url
     FROM task_comments tc
     JOIN users u ON u.id = tc.user_id
     WHERE tc.task_id = $1
     ORDER BY tc.created_at ASC`,
    [taskId]
  );
  return rows;
};

export const findById = async (id) => {
  const { rows } = await query('SELECT * FROM task_comments WHERE id = $1', [id]);
  return rows[0] || null;
};

export const remove = async (id) => {
  await query('DELETE FROM task_comments WHERE id = $1', [id]);
};
