// src/repositories/attachmentRepository.ts
import { query } from '../config/database.js';
import type { Attachment } from '../types/index.js';

export const create = async (data: { task_id: string; uploaded_by: string; filename: string; s3_key: string; url: string; mime_type?: string; size_bytes?: number }): Promise<Attachment> => {
  const { rows } = await query(
    `INSERT INTO attachments (task_id, uploaded_by, filename, s3_key, url, mime_type, size_bytes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [data.task_id, data.uploaded_by, data.filename, data.s3_key, data.url, data.mime_type ?? null, data.size_bytes ?? null]
  );
  return rows[0] as Attachment;
};

export const findByTask = async (taskId: string): Promise<Attachment[]> => {
  const { rows } = await query(
    `SELECT att.*, u.full_name as uploaded_by_name FROM attachments att JOIN users u ON u.id = att.uploaded_by WHERE att.task_id = $1 ORDER BY att.created_at DESC`,
    [taskId]
  );
  return rows as Attachment[];
};

export const findById = async (id: string): Promise<Attachment | null> => {
  const { rows } = await query('SELECT * FROM attachments WHERE id = $1', [id]);
  return (rows[0] as Attachment) ?? null;
};

export const remove = async (id: string): Promise<void> => {
  await query('DELETE FROM attachments WHERE id = $1', [id]);
};
