// src/routes/users.ts
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import * as userRepository from '../repositories/userRepository.js';
import * as apiResponse from '../utils/apiResponse.js';

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  /**
   * GET /api/v1/users/lookup?email=<email>
   *
   * Returns the user profile if a user with that email has ever signed in
   * (exists in our local users table). Returns 404 if not found.
   *
   * Frontend uses this to validate the assignee email before assigning a task.
   */
  fastify.get('/lookup', async (req, reply) => {
    const { email } = req.query as { email?: string };
    if (!email?.trim()) {
      return apiResponse.error(reply, 'email query param is required', 400);
    }
    const user = await userRepository.findByEmail(email.trim().toLowerCase());
    if (!user) {
      return apiResponse.error(reply, 'No user found with that email. They must sign in at least once first.', 404);
    }
    return apiResponse.success(reply, {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
    });
  });
}
