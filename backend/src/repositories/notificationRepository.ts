// src/repositories/notificationRepository.ts
import { query } from '../config/database.js';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  entity_id: string | null;
  entity_type: string | null;
  is_read: boolean;
  created_at: Date;
}

export const create = async (data: {
  user_id: string; type: string; title: string;
  message?: string; entity_id?: string; entity_type?: string;
}): Promise<Notification> => {
  const { rows } = await query(
    `INSERT INTO notifications (user_id, type, title, message, entity_id, entity_type)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.user_id, data.type, data.title, data.message ?? null, data.entity_id ?? null, data.entity_type ?? null]
  );
  return rows[0] as Notification;
};

export const findByUser = async (userId: string, limit = 50): Promise<Notification[]> => {
  const { rows } = await query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return rows as Notification[];
};

export const markRead = async (id: string, userId: string): Promise<void> => {
  await query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [id, userId]);
};

export const markAllRead = async (userId: string): Promise<void> => {
  await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
};

export const unreadCount = async (userId: string): Promise<number> => {
  const { rows } = await query(
    'SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = $1 AND is_read = false',
    [userId]
  );
  return parseInt(rows[0].cnt, 10);
};
