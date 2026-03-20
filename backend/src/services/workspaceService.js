// src/services/workspaceService.js

import * as workspaceRepository from '../repositories/workspaceRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import { ROLES } from '../constants/roles.js';

export const createWorkspace = async (userId, { name, description }) => {
  const workspace = await workspaceRepository.create({ name, description, owner_id: userId });
  // Auto-add creator as owner member
  await workspaceRepository.addMember(workspace.id, userId, ROLES.OWNER);
  return workspace;
};

export const getWorkspace = async (id) => {
  return workspaceRepository.findById(id);
};

export const listWorkspaces = async (userId) => {
  return workspaceRepository.findByUser(userId);
};

export const updateWorkspace = async (id, updates) => {
  return workspaceRepository.update(id, updates);
};

export const deleteWorkspace = async (id) => {
  return workspaceRepository.remove(id);
};

export const getMembers = async (workspaceId) => {
  return workspaceRepository.getMembers(workspaceId);
};

export const inviteMember = async (workspaceId, { email, role }) => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw Object.assign(new Error(`No user found with email: ${email}. They must sign up first.`), { statusCode: 404 });
  }
  return workspaceRepository.addMember(workspaceId, user.id, role);
};

export const removeMember = async (workspaceId, userId) => {
  await workspaceRepository.removeMember(workspaceId, userId);
};
