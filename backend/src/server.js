// src/server.js
// Entry point — starts Fastify + Socket.IO, connects DB and Redis

import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { connectDatabase } from './config/database.js';
import { initWebSocket } from './websocket/handler.js';

const start = async () => {
  const app = await buildApp();

  // ── Connect services ─────────────────────────────────────────
  try {
    await connectDatabase();
  } catch (err) {
    if (env.node.isProd) {
      logger.error({ err }, '❌ Cannot start without database in production');
      process.exit(1);
    } else {
      logger.warn({ err }, '⚠️  DB unavailable — running in dev without DB connection');
    }
  }

  try {
    await connectRedis();
  } catch (err) {
    logger.warn({ err }, '⚠️  Redis unavailable — continuing without cache');
  }

  // ── Start HTTP server ─────────────────────────────────────────
  try {
    await app.listen({ port: env.node.port, host: env.node.host });
    logger.info(`🚀 TaskFlow API    → http://localhost:${env.node.port}`);
    logger.info(`❤️  Health check   → http://localhost:${env.node.port}/health`);
    logger.info(`📡 API base        → http://localhost:${env.node.port}/api/${env.node.apiVersion}`);
  } catch (err) {
    logger.error({ err }, '❌ Failed to start server');
    process.exit(1);
  }

  // ── Socket.IO WebSocket ───────────────────────────────────────
  initWebSocket(app.server);
  logger.info(`🔌 WebSocket       → ws://localhost:${env.node.port}`);

  // ── Graceful shutdown ─────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    try {
      await app.close();
      await disconnectRedis();
      logger.info('✅ Server closed cleanly');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, '❌ Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
};

start();
