// src/app.js
// Fastify application factory — registers all plugins, middleware, and routes

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';

// Routes
import authRoutes       from './routes/auth.js';
import workspaceRoutes  from './routes/workspaces.js';
import projectRoutes    from './routes/projects.js';
import taskRoutes       from './routes/tasks.js';

export const buildApp = async () => {
  const app = Fastify({
    logger,
    trustProxy: true,
  });

  // ── Security ───────────────────────────────────────────────────
  await app.register(helmet, { contentSecurityPolicy: false });

  await app.register(cors, {
    origin: env.cors.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ── Rate limiting ──────────────────────────────────────────────
  await app.register(rateLimit, {
    max: env.rateLimit.max,
    timeWindow: env.rateLimit.windowMs,
    errorResponseBuilder: (_req, context) => ({
      success: false,
      message: `Too many requests. Please retry after ${context.after}.`,
      timestamp: new Date().toISOString(),
    }),
  });

  // ── File uploads ───────────────────────────────────────────────
  await app.register(multipart, {
    limits: { fileSize: env.upload.maxFileSizeMb * 1024 * 1024 },
  });

  // ── Health check ───────────────────────────────────────────────
  app.get('/health', async (_req, reply) =>
    reply.send({
      success: true,
      message: 'TaskFlow API is running',
      version: env.node.apiVersion,
      environment: env.node.env,
      timestamp: new Date().toISOString(),
    })
  );

  // ── API Routes ─────────────────────────────────────────────────
  const prefix = `/api/${env.node.apiVersion}`;
  await app.register(authRoutes,      { prefix: `${prefix}/auth` });
  await app.register(workspaceRoutes, { prefix: `${prefix}/workspaces` });
  await app.register(projectRoutes,   { prefix: `${prefix}/projects` });
  await app.register(taskRoutes,      { prefix: `${prefix}/tasks` });

  // ── Global error handler ───────────────────────────────────────
  app.setErrorHandler((err, _req, reply) => {
    const statusCode = err.statusCode || 500;
    app.log.error(err);
    return reply.code(statusCode).send({
      success: false,
      message: statusCode === 500 ? 'Internal Server Error' : err.message,
      errors: env.node.isDev ? err.stack : null,
      timestamp: new Date().toISOString(),
    });
  });

  app.setNotFoundHandler((_req, reply) =>
    reply.code(404).send({
      success: false,
      message: 'Route not found',
      timestamp: new Date().toISOString(),
    })
  );

  return app;
};

export default buildApp;
