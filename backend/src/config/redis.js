// src/config/redis.js
// Redis client using ioredis — supports caching, pub/sub, and Bull queues

import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const commonOptions = {
  host: env.redis.host,
  port: env.redis.port,
  db: env.redis.db,
  password: env.redis.password || undefined,
  retryStrategy(times) {
    if (times > 5) return null; // Stop retrying after 5 attempts — prevents infinite reconnect loops
    const delay = Math.min(times * 200, 2000);
    logger.warn({ attempt: times, delay }, 'Redis reconnecting...');
    return delay;
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,          // Don't auto-connect on instantiation
  enableOfflineQueue: false,  // Fail requests immediately when offline
};

if (env.redis.tls) {
  commonOptions.tls = {};
}

// Primary client — for general caching ops
const redisClient = new Redis(commonOptions);

// Subscriber client — dedicated for pub/sub (cannot run commands while subscribed)
const redisSub = new Redis(commonOptions);

// Publisher client — dedicated for pub/sub publishing
const redisPub = new Redis(commonOptions);

redisClient.on('connect', () => logger.info('✅ Redis client connected'));
redisClient.on('error', (err) => logger.error({ err }, '❌ Redis client error'));
redisClient.on('reconnecting', () => logger.warn('Redis client reconnecting...'));

redisSub.on('connect', () => logger.debug('Redis subscriber connected'));
redisPub.on('connect', () => logger.debug('Redis publisher connected'));

// Connect and test
export const connectRedis = async () => {
  try {
    await redisClient.connect();
    await redisClient.ping();
    logger.info('✅ Redis connection verified (PING→PONG)');
  } catch (err) {
    logger.warn({ err }, '⚠️  Redis connection failed — running without cache');
    throw err;
  }
};

// Graceful shutdown
export const disconnectRedis = async () => {
  await Promise.all([
    redisClient.quit(),
    redisSub.quit(),
    redisPub.quit(),
  ]);
  logger.info('Redis connections closed');
};

export { redisClient, redisSub, redisPub };
export default redisClient;
