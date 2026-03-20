// src/controllers/workspaceController.js

import * as workspaceService from '../services/workspaceService.js';
import * as apiResponse from '../utils/apiResponse.js';

export const createWorkspace = async (req, reply) => {
  const workspace = await workspaceService.createWorkspace(req.user.id, req.body);
  return apiResponse.created(reply, workspace, 'Workspace created');
};

export const listWorkspaces = async (req, reply) => {
  const workspaces = await workspaceService.listWorkspaces(req.user.id);
  return apiResponse.success(reply, workspaces);
};

export const getWorkspace = async (req, reply) => {
  const workspace = await workspaceService.getWorkspace(req.params.id);
  if (!workspace) return apiResponse.notFound(reply, 'Workspace');
  return apiResponse.success(reply, workspace);
};

export const updateWorkspace = async (req, reply) => {
  const workspace = await workspaceService.updateWorkspace(req.params.id, req.body);
  return apiResponse.success(reply, workspace, 'Workspace updated');
};

export const deleteWorkspace = async (req, reply) => {
  await workspaceService.deleteWorkspace(req.params.id);
  return apiResponse.success(reply, null, 'Workspace deleted');
};

export const getMembers = async (req, reply) => {
  const members = await workspaceService.getMembers(req.params.id);
  return apiResponse.success(reply, members);
};

export const inviteMember = async (req, reply) => {
  const member = await workspaceService.inviteMember(req.params.id, req.body);
  return apiResponse.created(reply, member, 'Member invited');
};

export const removeMember = async (req, reply) => {
  await workspaceService.removeMember(req.params.id, req.params.userId);
  return apiResponse.success(reply, null, 'Member removed');
};
