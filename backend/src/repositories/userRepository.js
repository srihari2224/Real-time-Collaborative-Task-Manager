// src/repositories/userRepository.js

import { query } from '../config/database.js';

export const upsertUser = async ({ id, email, full_name, avatar_url }) => {
  const { rows } = await query(
    `INSERT INTO users (id, email, full_name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email,
           full_name = COALESCE(EXCLUDED.full_name, users.full_name),
           avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
           updated_at = NOW()
     RETURNING *`,
    [id, email, full_name, avatar_url]
  );
  return rows[0];
};

export const findById = async (id) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
};

export const findByEmail = async (email) => {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
};

export const updateUser = async (id, updates) => {
  const { full_name, avatar_url } = updates;
  const { rows } = await query(
    `UPDATE users SET full_name = COALESCE($2, full_name),
                      avatar_url = COALESCE($3, avatar_url),
                      updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, full_name, avatar_url]
  );
  return rows[0];
};
