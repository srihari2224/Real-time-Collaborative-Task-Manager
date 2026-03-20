// src/routes/auth.js

import { requireAuth } from '../middlewares/auth.js';
import * as authController from '../controllers/authController.js';

export default async function authRoutes(fastify) {
  // POST /auth/sync — call after Supabase login to upsert user in DB
  fastify.post('/sync', { preHandler: [requireAuth] }, authController.syncUser);

  // GET /auth/me
  fastify.get('/me', { preHandler: [requireAuth] }, authController.getMe);
}
