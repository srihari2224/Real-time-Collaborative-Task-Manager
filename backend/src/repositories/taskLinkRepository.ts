// src/repositories/taskLinkRepository.ts
import { query } from '../config/database.js';

export interface TaskLink {
  id: string;
  task_id: string;
  url: string;
  label: string | null;
  added_by: string;
  created_at: Date;
}

export const findByTask = async (taskId: string): Promise<TaskLink[]> => {
  const { rows } = await query(
    'SELECT * FROM task_links WHERE task_id = $1 ORDER BY created_at ASC',
    [taskId]
  );
  return rows as TaskLink[];
};

export const create = async (data: {
  task_id: string; url: string; label?: string; added_by: string;
}): Promise<TaskLink> => {
  const { rows } = await query(
    `INSERT INTO task_links (task_id, url, label, added_by)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [data.task_id, data.url, data.label ?? null, data.added_by]
  );
  return rows[0] as TaskLink;
};

export const remove = async (id: string, userId: string): Promise<void> => {
  await query('DELETE FROM task_links WHERE id = $1 AND added_by = $2', [id, userId]);
};
