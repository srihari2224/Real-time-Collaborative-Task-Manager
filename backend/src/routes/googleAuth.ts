// src/routes/googleAuth.ts
// Public route — no auth required (this IS the login endpoint)
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyGoogleToken } from '../services/googleAuthService.js';
import * as userRepository from '../repositories/userRepository.js';
import * as apiResponse from '../utils/apiResponse.js';

interface GoogleLoginBody {
  credential: string;
}

export default async function googleAuthRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    async (req: FastifyRequest<{ Body: GoogleLoginBody }>, reply: FastifyReply) => {
      const { credential } = req.body ?? {};
      if (!credential) {
        return reply.code(400).send({ success: false, message: 'Missing Google credential' });
      }

      try {
        // Verify the Google ID token
        const googleUser = await verifyGoogleToken(credential);

        // Upsert user into our DB using the deterministic Google UUID
        const user = await userRepository.upsertUser({
          id: googleUser.id,
          email: googleUser.email,
          full_name: googleUser.name,
          avatar_url: googleUser.picture,
        });

        return apiResponse.success(reply, user, 'Google login successful');
      } catch (err: any) {
        fastify.log.error({ err }, 'Google login failed');
        return reply.code(401).send({
          success: false,
          message: err?.message ?? 'Google authentication failed',
        });
      }
    }
  );
}


