// src/services/projectService.ts
import type { Project } from '../types/index.js';
import * as projectRepository from '../repositories/projectRepository.js';

export const createProject = async (
  userId: string,
  workspaceId: string,
  data: { name: string; description?: string; color?: string }
): Promise<Project> =>
  projectRepository.create({ workspace_id: workspaceId, name: data.name, description: data.description, color: data.color, created_by: userId });

export const getProject = (id: string) => projectRepository.findById(id);
export const listProjects = (workspaceId: string) => projectRepository.findByWorkspace(workspaceId);
export const updateProject = (id: string, updates: Partial<Project>) => projectRepository.update(id, updates);
export const deleteProject = (id: string) => projectRepository.remove(id);
