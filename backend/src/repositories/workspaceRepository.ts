// src/repositories/workspaceRepository.ts
import { query } from '../config/database.js';
import type { Workspace, WorkspaceMember, Role } from '../types/index.js';

export const create = async (data: { name: string; description?: string; logo_url?: string; owner_id: string }): Promise<Workspace> => {
  const { rows } = await query(
    `INSERT INTO workspaces (name, description, logo_url, owner_id) VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.name, data.description ?? null, data.logo_url ?? null, data.owner_id]
  );
  return rows[0] as Workspace;
};

export const findById = async (id: string): Promise<Workspace | null> => {
  const { rows } = await query(
    `SELECT w.*, u.full_name as owner_name, u.email as owner_email FROM workspaces w JOIN users u ON u.id = w.owner_id WHERE w.id = $1`,
    [id]
  );
  return (rows[0] as Workspace) ?? null;
};

export const findByUser = async (userId: string): Promise<Workspace[]> => {
  const { rows } = await query(
    `SELECT w.*, wm.role, u.full_name as owner_name FROM workspaces w
     JOIN workspace_members wm ON wm.workspace_id = w.id
     JOIN users u ON u.id = w.owner_id
     WHERE wm.user_id = $1 ORDER BY w.created_at DESC`,
    [userId]
  );
  return rows as Workspace[];
};

export const update = async (id: string, data: Partial<Pick<Workspace, 'name' | 'description' | 'logo_url'>>): Promise<Workspace> => {
  const { rows } = await query(
    `UPDATE workspaces SET name = COALESCE($2, name), description = COALESCE($3, description), logo_url = COALESCE($4, logo_url), updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, data.name ?? null, data.description ?? null, data.logo_url ?? null]
  );
  return rows[0] as Workspace;
};

export const remove = async (id: string): Promise<void> => {
  await query('DELETE FROM workspaces WHERE id = $1', [id]);
};

export const addMember = async (workspaceId: string, userId: string, role: Role = 'member'): Promise<WorkspaceMember> => {
  const { rows } = await query(
    `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role RETURNING *`,
    [workspaceId, userId, role]
  );
  return rows[0] as WorkspaceMember;
};

export const removeMember = async (workspaceId: string, userId: string): Promise<void> => {
  await query('DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2', [workspaceId, userId]);
};

export const getMember = async (workspaceId: string, userId: string): Promise<WorkspaceMember | null> => {
  const { rows } = await query('SELECT * FROM workspace_members WHERE workspace_id = $1 AND user_id = $2', [workspaceId, userId]);
  return (rows[0] as WorkspaceMember) ?? null;
};

export const getMembers = async (workspaceId: string): Promise<WorkspaceMember[]> => {
  const { rows } = await query(
    `SELECT wm.*, u.email, u.full_name, u.avatar_url FROM workspace_members wm JOIN users u ON u.id = wm.user_id WHERE wm.workspace_id = $1 ORDER BY wm.joined_at ASC`,
    [workspaceId]
  );
  return rows as WorkspaceMember[];
};
