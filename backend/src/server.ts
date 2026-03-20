// src/server.ts
// Production entry point — boots Fastify + Socket.IO
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { connectDatabase } from './config/database.js';
import { initWebSocket } from './websocket/handler.js';

const start = async (): Promise<void> => {
  const app = await buildApp();

  // Database
  try {
    await connectDatabase();
  } catch (err) {
    if (env.node.isProd) {
      logger.error({ err }, '❌ Cannot start without database in production');
      process.exit(1);
    }
    logger.warn('⚠️  DB unavailable — running in dev without DB');
  }

  // Redis (non-fatal)
  try { await connectRedis(); }
  catch { logger.warn('⚠️  Redis unavailable — running without cache'); }

  // HTTP server
  try {
    await app.listen({ port: env.node.port, host: env.node.host });
    logger.info(`🚀 TaskFlow API    → http://localhost:${env.node.port}`);
    logger.info(`❤️  Health check   → http://localhost:${env.node.port}/health`);
    logger.info(`📡 API base        → http://localhost:${env.node.port}/api/${env.node.apiVersion}`);
  } catch (err) {
    logger.error({ err }, '❌ Failed to start server');
    process.exit(1);
  }

  // WebSocket
  initWebSocket(app.server);
  logger.info(`🔌 WebSocket       → ws://localhost:${env.node.port}`);

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down`);
    try { await app.close(); await disconnectRedis(); process.exit(0); }
    catch { process.exit(1); }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));
};

void start();
