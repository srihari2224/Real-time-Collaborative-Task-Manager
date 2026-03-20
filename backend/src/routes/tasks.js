// src/routes/tasks.js

import { requireAuth } from '../middlewares/auth.js';
import * as taskController from '../controllers/taskController.js';

export default async function taskRoutes(fastify) {
  fastify.addHook('preHandler', requireAuth);

  // Tasks
  fastify.post('/', taskController.createTask);
  fastify.get('/project/:projectId', taskController.listTasks);
  fastify.get('/:id', taskController.getTask);
  fastify.put('/:id', taskController.updateTask);
  fastify.delete('/:id', taskController.deleteTask);

  // Comments on a task
  fastify.post('/:id/comments', taskController.addComment);
  fastify.get('/:id/comments', taskController.listComments);
  fastify.delete('/:id/comments/:commentId', taskController.deleteComment);

  // Attachments on a task
  fastify.post('/:id/attachments', taskController.uploadAttachment);
  fastify.get('/:id/attachments', taskController.listAttachments);
  fastify.delete('/:id/attachments/:attachmentId', taskController.deleteAttachment);
}
