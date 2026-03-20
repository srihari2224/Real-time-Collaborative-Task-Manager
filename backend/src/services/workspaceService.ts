// src/services/workspaceService.ts
import type { Workspace, WorkspaceMember } from '../types/index.js';
import * as workspaceRepository from '../repositories/workspaceRepository.js';
import * as userRepository from '../repositories/userRepository.js';

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
  const user = await userRepository.findByEmail(data.email);
  if (!user) {
    const err = new Error(`No user found with email: ${data.email}. They must sign up first.`);
    (err as NodeJS.ErrnoException).code = '404';
    throw Object.assign(err, { statusCode: 404 });
  }
  return workspaceRepository.addMember(workspaceId, user.id, data.role);
};

export const removeMember = async (workspaceId: string, userId: string): Promise<void> =>
  workspaceRepository.removeMember(workspaceId, userId);
