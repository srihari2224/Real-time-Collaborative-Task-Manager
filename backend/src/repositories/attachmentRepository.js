// src/repositories/attachmentRepository.js

import { query } from '../config/database.js';

export const create = async ({ task_id, uploaded_by, filename, s3_key, url, mime_type, size_bytes }) => {
  const { rows } = await query(
    `INSERT INTO attachments (task_id, uploaded_by, filename, s3_key, url, mime_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [task_id, uploaded_by, filename, s3_key, url, mime_type, size_bytes]
  );
  return rows[0];
};

export const findByTask = async (taskId) => {
  const { rows } = await query(
    `SELECT att.*, u.full_name as uploaded_by_name
     FROM attachments att
     JOIN users u ON u.id = att.uploaded_by
     WHERE att.task_id = $1
     ORDER BY att.created_at DESC`,
    [taskId]
  );
  return rows;
};

export const findById = async (id) => {
  const { rows } = await query('SELECT * FROM attachments WHERE id = $1', [id]);
  return rows[0] || null;
};

export const remove = async (id) => {
  await query('DELETE FROM attachments WHERE id = $1', [id]);
};
