// src/controllers/workspaceController.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import * as workspaceService from '../services/workspaceService.js';
import * as apiResponse from '../utils/apiResponse.js';

export const createWorkspace = async (req: FastifyRequest, reply: FastifyReply) =>
  apiResponse.created(reply, await workspaceService.createWorkspace(req.user!.id, req.body as any), 'Workspace created');

export const listWorkspaces = async (req: FastifyRequest, reply: FastifyReply) =>
  apiResponse.success(reply, await workspaceService.listWorkspaces(req.user!.id));

export const getWorkspace = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const ws = await workspaceService.getWorkspace(id);
  return ws ? apiResponse.success(reply, ws) : apiResponse.notFound(reply, 'Workspace');
};

export const updateWorkspace = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  return apiResponse.success(reply, await workspaceService.updateWorkspace(id, req.body as any), 'Workspace updated');
};

export const deleteWorkspace = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  await workspaceService.deleteWorkspace(id);
  return apiResponse.success(reply, null, 'Workspace deleted');
};

export const getMembers = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  return apiResponse.success(reply, await workspaceService.getMembers(id));
};

export const inviteMember = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  return apiResponse.created(reply, await workspaceService.inviteMember(id, req.body as any), 'Member invited');
};

export const removeMember = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id, userId } = req.params as { id: string; userId: string };
  await workspaceService.removeMember(id, userId);
  return apiResponse.success(reply, null, 'Member removed');
};
