// src/routes/workspaces.ts
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import * as wc from '../controllers/workspaceController.js';

export default async function workspaceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.post('/', wc.createWorkspace);
  fastify.get('/', wc.listWorkspaces);
  fastify.get('/:id', wc.getWorkspace);
  fastify.put('/:id',    { preHandler: [requireRole('admin')] }, wc.updateWorkspace);
  fastify.delete('/:id', { preHandler: [requireRole('owner')] }, wc.deleteWorkspace);

  fastify.get('/:id/members',              wc.getMembers);
  fastify.post('/:id/members',             { preHandler: [requireRole('admin')] }, wc.inviteMember);
  fastify.delete('/:id/members/:userId',   { preHandler: [requireRole('admin')] }, wc.removeMember);
}
