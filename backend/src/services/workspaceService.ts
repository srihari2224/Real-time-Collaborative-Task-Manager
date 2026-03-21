// src/services/workspaceService.ts
import type { Workspace, WorkspaceMember } from '../types/index.js';
import * as workspaceRepository from '../repositories/workspaceRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import { inviteUser } from '../config/supabase.js';

export const createWorkspace = async (
  userId: string,
  data: { name: string; description?: string }
): Promise<Workspace> => {
  const workspace = await workspaceRepository.create({ ...data, owner_id: userId });
  await workspaceRepository.addMember(workspace.id, userId, 'owner');
  return workspace;
};

export const getWorkspace = async (id: string): Promise<Workspace | null> =>
  workspaceRepository.findById(id);

export const listWorkspaces = async (userId: string): Promise<Workspace[]> =>
  workspaceRepository.findByUser(userId);

export const updateWorkspace = async (id: string, updates: Partial<Workspace>): Promise<Workspace> =>
  workspaceRepository.update(id, updates);

export const deleteWorkspace = async (id: string): Promise<void> =>
  workspaceRepository.remove(id);

export const getMembers = async (workspaceId: string): Promise<WorkspaceMember[]> =>
  workspaceRepository.getMembers(workspaceId);

export const inviteMember = async (
  workspaceId: string,
  data: { email: string; role: 'admin' | 'member' | 'guest' }
): Promise<WorkspaceMember> => {
  let user = await userRepository.findByEmail(data.email);
  if (!user) {
    try {
      const authUser = await inviteUser(data.email);
      user = await userRepository.upsertUser({ 
        id: authUser.id, 
        email: authUser.email || data.email,
        full_name: null,
      });
    } catch (err: any) {
      const customErr = new Error(`Failed to invite user: ${err.message}`);
      (customErr as NodeJS.ErrnoException).code = '400';
      throw Object.assign(customErr, { statusCode: 400 });
    }
  }
  return workspaceRepository.addMember(workspaceId, user.id, data.role);
};

export const removeMember = async (workspaceId: string, userId: string): Promise<void> =>
  workspaceRepository.removeMember(workspaceId, userId);
