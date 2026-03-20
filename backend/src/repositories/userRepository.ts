// src/repositories/userRepository.ts
import { query } from '../config/database.js';
import type { User } from '../types/index.js';

export const upsertUser = async (data: { id: string; email: string; full_name?: string | null; avatar_url?: string | null }): Promise<User> => {
  const { rows } = await query(
    `INSERT INTO users (id, email, full_name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email,
           full_name  = COALESCE(EXCLUDED.full_name, users.full_name),
           avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
           updated_at = NOW()
     RETURNING *`,
    [data.id, data.email, data.full_name ?? null, data.avatar_url ?? null]
  );
  return rows[0] as User;
};

export const findById = async (id: string): Promise<User | null> => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return (rows[0] as User) ?? null;
};

export const findByEmail = async (email: string): Promise<User | null> => {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  return (rows[0] as User) ?? null;
};

export const updateUser = async (id: string, updates: Partial<Pick<User, 'full_name' | 'avatar_url'>>): Promise<User> => {
  const { rows } = await query(
    `UPDATE users SET full_name = COALESCE($2, full_name), avatar_url = COALESCE($3, avatar_url), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, updates.full_name ?? null, updates.avatar_url ?? null]
  );
  return rows[0] as User;
};
