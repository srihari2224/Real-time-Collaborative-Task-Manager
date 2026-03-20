// src/routes/workspaces.js

import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import * as workspaceController from '../controllers/workspaceController.js';
import Joi from 'joi';

const bodySchema = (schema) => ({ schema: { body: schema } });

export default async function workspaceRoutes(fastify) {
  // All workspace routes require authentication
  fastify.addHook('preHandler', requireAuth);

  // Workspace CRUD
  fastify.post('/', workspaceController.createWorkspace);
  fastify.get('/', workspaceController.listWorkspaces);
  fastify.get('/:id', workspaceController.getWorkspace);
  fastify.put('/:id', { preHandler: [requireRole('admin')] }, workspaceController.updateWorkspace);
  fastify.delete('/:id', { preHandler: [requireRole('owner')] }, workspaceController.deleteWorkspace);

  // Members
  fastify.get('/:id/members', workspaceController.getMembers);
  fastify.post('/:id/members', { preHandler: [requireRole('admin')] }, workspaceController.inviteMember);
  fastify.delete('/:id/members/:userId', { preHandler: [requireRole('admin')] }, workspaceController.removeMember);
}
