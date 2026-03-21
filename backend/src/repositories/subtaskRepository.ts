// src/repositories/subtaskRepository.ts
import { query } from '../config/database.js';

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_done: boolean;
  position: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export const findByTask = async (taskId: string): Promise<Subtask[]> => {
  const { rows } = await query(
    'SELECT * FROM subtasks WHERE task_id = $1 ORDER BY position ASC, created_at ASC',
    [taskId]
  );
  return rows as Subtask[];
};

export const create = async (data: {
  task_id: string; title: string; position?: number; created_by: string;
}): Promise<Subtask> => {
  const { rows } = await query(
    `INSERT INTO subtasks (task_id, title, position, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.task_id, data.title, data.position ?? 0, data.created_by]
  );
  return rows[0] as Subtask;
};

export const update = async (
  id: string,
  data: Partial<Pick<Subtask, 'title' | 'is_done' | 'position'>>
): Promise<Subtask | null> => {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (data.title !== undefined)    { sets.push(`title = $${i++}`);    vals.push(data.title); }
  if (data.is_done !== undefined)  { sets.push(`is_done = $${i++}`);  vals.push(data.is_done); }
  if (data.position !== undefined) { sets.push(`position = $${i++}`); vals.push(data.position); }
  if (!sets.length) return null;
  sets.push(`updated_at = NOW()`);
  vals.push(id);
  const { rows } = await query(
    `UPDATE subtasks SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    vals
  );
  return (rows[0] as Subtask) ?? null;
};

export const remove = async (id: string): Promise<void> => {
  await query('DELETE FROM subtasks WHERE id = $1', [id]);
};

/** Returns true when all subtasks for this task are done */
export const allDone = async (taskId: string): Promise<boolean> => {
  const { rows } = await query(
    'SELECT COUNT(*) FILTER (WHERE NOT is_done) AS pending FROM subtasks WHERE task_id = $1',
    [taskId]
  );
  return parseInt(rows[0].pending ?? '1', 10) === 0;
};

/** Total and done counts */
export const progress = async (taskId: string): Promise<{ total: number; done: number }> => {
  const { rows } = await query(
    `SELECT
       COUNT(*)                           AS total,
       COUNT(*) FILTER (WHERE is_done)    AS done
     FROM subtasks WHERE task_id = $1`,
    [taskId]
  );
  return { total: parseInt(rows[0].total, 10), done: parseInt(rows[0].done, 10) };
};
