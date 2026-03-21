// src/routes/notifications.ts
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import * as nc from '../controllers/notificationController.js';

export default async function notificationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/', nc.listNotifications);
  fastify.patch('/:id/read', nc.markRead);
  fastify.patch('/read-all', nc.markAllRead);
}
