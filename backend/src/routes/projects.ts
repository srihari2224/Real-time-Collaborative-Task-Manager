// src/routes/projects.ts
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import * as pc from '../controllers/projectController.js';

export default async function projectRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.post('/', pc.createProject);
  fastify.get('/workspace/:workspaceId', pc.listProjects);
  fastify.get('/:id', pc.getProject);
  fastify.put('/:id', pc.updateProject);
  fastify.delete('/:id', pc.deleteProject);
}
