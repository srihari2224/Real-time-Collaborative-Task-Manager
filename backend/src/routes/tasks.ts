// src/routes/tasks.ts
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import * as tc from '../controllers/taskController.js';

export default async function taskRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.post('/', tc.createTask);
  fastify.get('/project/:projectId', tc.listTasks);
  fastify.get('/:id', tc.getTask);
  fastify.put('/:id', tc.updateTask);
  fastify.delete('/:id', tc.deleteTask);

  fastify.post('/:id/comments', tc.addComment);
  fastify.get('/:id/comments', tc.listComments);
  fastify.delete('/:id/comments/:commentId', tc.deleteComment);

  fastify.post('/:id/attachments', tc.uploadAttachment);
  fastify.get('/:id/attachments', tc.listAttachments);
  fastify.delete('/:id/attachments/:attachmentId', tc.deleteAttachment);
}
