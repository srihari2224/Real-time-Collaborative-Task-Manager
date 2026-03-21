// src/routes/auth.ts
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import * as authController from '../controllers/authController.js';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/sync', { preHandler: [requireAuth] }, authController.syncUser);
  fastify.get('/me', { preHandler: [requireAuth] }, authController.getMe);
  fastify.patch('/profile', { preHandler: [requireAuth] }, authController.updateProfile);
}
