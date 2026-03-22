// src/routes/tasks.ts
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import * as tc from '../controllers/taskController.js';

export default async function taskRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  // Tasks
  fastify.post('/', tc.createTask);
  fastify.get('/my-tasks', tc.listMyTasks);
  fastify.get('/project/:projectId', tc.listTasks);
  fastify.get('/:id', tc.getTask);
  fastify.put('/:id', tc.updateTask);
  fastify.delete('/:id', tc.deleteTask);

  // Subtasks
  fastify.get('/:id/subtasks', tc.listSubtasks);
  fastify.post('/:id/subtasks', tc.createSubtask);
  fastify.patch('/:id/subtasks/:subtaskId', tc.updateSubtask);
  fastify.delete('/:id/subtasks/:subtaskId', tc.deleteSubtask);

  // Comments
  fastify.post('/:id/comments', tc.addComment);
  fastify.get('/:id/comments', tc.listComments);
  fastify.delete('/:id/comments/:commentId', tc.deleteComment);

  // Links
  fastify.get('/:id/links', tc.listLinks);
  fastify.post('/:id/links', tc.addLink);
  fastify.delete('/:id/links/:linkId', tc.removeLink);

  // Attachments
  fastify.post('/:id/attachments', tc.uploadAttachment);
  fastify.get('/:id/attachments', tc.listAttachments);
  fastify.delete('/:id/attachments/:attachmentId', tc.deleteAttachment);
}
