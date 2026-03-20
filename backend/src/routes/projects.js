// src/routes/projects.js

import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import * as projectController from '../controllers/projectController.js';

export default async function projectRoutes(fastify) {
  fastify.addHook('preHandler', requireAuth);

  // Create project (workspaceId in body)
  fastify.post('/', projectController.createProject);

  // List projects in a workspace
  fastify.get('/workspace/:workspaceId', projectController.listProjects);

  // Single project operations
  fastify.get('/:id', projectController.getProject);
  fastify.put('/:id', projectController.updateProject);
  fastify.delete('/:id', projectController.deleteProject);
}
