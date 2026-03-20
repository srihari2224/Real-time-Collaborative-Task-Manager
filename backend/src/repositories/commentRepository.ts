// src/repositories/commentRepository.ts
import { query } from '../config/database.js';
import type { Comment } from '../types/index.js';

export const create = async (data: { task_id: string; user_id: string; content: string }): Promise<Comment> => {
  const { rows } = await query(
    `INSERT INTO task_comments (task_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
    [data.task_id, data.user_id, data.content]
  );
  return rows[0] as Comment;
};

export const findByTask = async (taskId: string): Promise<Comment[]> => {
  const { rows } = await query(
    `SELECT tc.*, u.full_name, u.email, u.avatar_url FROM task_comments tc JOIN users u ON u.id = tc.user_id WHERE tc.task_id = $1 ORDER BY tc.created_at ASC`,
    [taskId]
  );
  return rows as Comment[];
};

export const findById = async (id: string): Promise<Comment | null> => {
  const { rows } = await query('SELECT * FROM task_comments WHERE id = $1', [id]);
  return (rows[0] as Comment) ?? null;
};

export const remove = async (id: string): Promise<void> => {
  await query('DELETE FROM task_comments WHERE id = $1', [id]);
};
