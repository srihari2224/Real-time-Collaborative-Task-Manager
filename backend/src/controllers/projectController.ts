// src/controllers/projectController.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import * as projectService from '../services/projectService.js';
import * as apiResponse from '../utils/apiResponse.js';

export const createProject = async (req: FastifyRequest, reply: FastifyReply) => {
  const body = req.body as any;
  const workspaceId = body.workspace_id;
  return apiResponse.created(reply, await projectService.createProject(req.user!.id, workspaceId, body), 'Project created');
};

export const listProjects = async (req: FastifyRequest, reply: FastifyReply) => {
  const { workspaceId } = req.params as { workspaceId: string };
  return apiResponse.success(reply, await projectService.listProjects(workspaceId));
};

export const getProject = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const p = await projectService.getProject(id);
  return p ? apiResponse.success(reply, p) : apiResponse.notFound(reply, 'Project');
};

export const updateProject = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  return apiResponse.success(reply, await projectService.updateProject(id, req.body as any), 'Project updated');
};

export const deleteProject = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  await projectService.deleteProject(id);
  return apiResponse.success(reply, null, 'Project deleted');
};
