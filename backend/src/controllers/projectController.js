// src/controllers/projectController.js

import * as projectService from '../services/projectService.js';
import * as apiResponse from '../utils/apiResponse.js';

export const createProject = async (req, reply) => {
  const workspaceId = req.body.workspace_id || req.params.workspaceId;
  const project = await projectService.createProject(req.user.id, workspaceId, req.body);
  return apiResponse.created(reply, project, 'Project created');
};

export const listProjects = async (req, reply) => {
  const projects = await projectService.listProjects(req.params.workspaceId);
  return apiResponse.success(reply, projects);
};

export const getProject = async (req, reply) => {
  const project = await projectService.getProject(req.params.id);
  if (!project) return apiResponse.notFound(reply, 'Project');
  return apiResponse.success(reply, project);
};

export const updateProject = async (req, reply) => {
  const project = await projectService.updateProject(req.params.id, req.body);
  return apiResponse.success(reply, project, 'Project updated');
};

export const deleteProject = async (req, reply) => {
  await projectService.deleteProject(req.params.id);
  return apiResponse.success(reply, null, 'Project deleted');
};
