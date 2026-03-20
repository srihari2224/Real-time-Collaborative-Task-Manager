// src/repositories/workspaceRepository.js

import { query } from '../config/database.js';

// ─── Workspaces ────────────────────────────────────────────────
export const create = async ({ name, description, logo_url, owner_id }) => {
  const { rows } = await query(
    `INSERT INTO workspaces (name, description, logo_url, owner_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, description, logo_url, owner_id]
  );
  return rows[0];
};

export const findById = async (id) => {
  const { rows } = await query(
    `SELECT w.*, u.full_name as owner_name, u.email as owner_email
     FROM workspaces w
     JOIN users u ON u.id = w.owner_id
     WHERE w.id = $1`,
    [id]
  );
  return rows[0] || null;
};

export const findByUser = async (userId) => {
  const { rows } = await query(
    `SELECT w.*, wm.role, u.full_name as owner_name
     FROM workspaces w
     JOIN workspace_members wm ON wm.workspace_id = w.id
     JOIN users u ON u.id = w.owner_id
     WHERE wm.user_id = $1
     ORDER BY w.created_at DESC`,
    [userId]
  );
  return rows;
};

export const update = async (id, { name, description, logo_url }) => {
  const { rows } = await query(
    `UPDATE workspaces SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       logo_url = COALESCE($4, logo_url),
       updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, name, description, logo_url]
  );
  return rows[0];
};

export const remove = async (id) => {
  await query('DELETE FROM workspaces WHERE id = $1', [id]);
};

// ─── Members ──────────────────────────────────────────────────
export const addMember = async (workspaceId, userId, role = 'member') => {
  const { rows } = await query(
    `INSERT INTO workspace_members (workspace_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role
     RETURNING *`,
    [workspaceId, userId, role]
  );
  return rows[0];
};

export const removeMember = async (workspaceId, userId) => {
  await query(
    'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );
};

export const getMember = async (workspaceId, userId) => {
  const { rows } = await query(
    'SELECT * FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );
  return rows[0] || null;
};

export const getMembers = async (workspaceId) => {
  const { rows } = await query(
    `SELECT wm.*, u.email, u.full_name, u.avatar_url
     FROM workspace_members wm
     JOIN users u ON u.id = wm.user_id
     WHERE wm.workspace_id = $1
     ORDER BY wm.joined_at ASC`,
    [workspaceId]
  );
  return rows;
};
