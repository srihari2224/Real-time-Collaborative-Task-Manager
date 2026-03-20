// src/services/projectService.js

import * as projectRepository from '../repositories/projectRepository.js';

export const createProject = async (userId, workspaceId, { name, description, color }) => {
  return projectRepository.create({ workspace_id: workspaceId, name, description, color, created_by: userId });
};

export const getProject = async (id) => {
  return projectRepository.findById(id);
};

export const listProjects = async (workspaceId) => {
  return projectRepository.findByWorkspace(workspaceId);
};

export const updateProject = async (id, updates) => {
  return projectRepository.update(id, updates);
};

export const deleteProject = async (id) => {
  return projectRepository.remove(id);
};
