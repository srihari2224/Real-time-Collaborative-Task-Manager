// src/routes/notifications.ts
// Stub endpoint — returns empty array until a full notifications system is built.
// The frontend Inbox page calls this instead of rendering static seed data.
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import * as apiResponse from '../utils/apiResponse.js';

export default async function notificationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  // GET /api/v1/notifications — list notifications for the current user
  fastify.get('/', async (req, reply) => {
    // TODO: implement real notification storage in a future iteration.
    // For now return an empty array so the frontend shows the correct empty state.
    return apiResponse.success(reply, [], 'Notifications fetched');
  });

  // PATCH /api/v1/notifications/:id/read — mark one notification as read
  fastify.patch('/:id/read', async (req, reply) => {
    return apiResponse.success(reply, null, 'Notification marked as read');
  });

  // PATCH /api/v1/notifications/read-all — mark all as read
  fastify.patch('/read-all', async (req, reply) => {
    return apiResponse.success(reply, null, 'All notifications marked as read');
  });
}
