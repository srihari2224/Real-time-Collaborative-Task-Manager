// src/config/redis.ts
import IoRedis, { type Redis as RedisType } from 'ioredis';
import type { RedisOptions } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const commonOptions: RedisOptions = {
  host: env.redis.host,
  port: env.redis.port,
  db: env.redis.db,
  password: env.redis.password || undefined,
  retryStrategy(times) {
    if (times > 5) return null;
    const delay = Math.min(times * 200, 2000);
    logger.warn({ attempt: times, delay }, 'Redis reconnecting...');
    return delay;
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  enableOfflineQueue: false,
  ...(env.redis.tls ? { tls: {} } : {}),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RedisClass = (IoRedis as any).default ?? IoRedis;
export const redisClient: RedisType = new RedisClass(commonOptions);
export const redisSub: RedisType    = new RedisClass(commonOptions);
export const redisPub: RedisType    = new RedisClass(commonOptions);

redisClient.on('connect', () => logger.info('✅ Redis client connected'));
redisClient.on('error', (err: Error) => logger.warn({ err }, 'Redis client error'));
redisSub.on('error', (_err: Error) => { /* suppress */ });
redisPub.on('error', (_err: Error) => { /* suppress */ });

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    await redisClient.ping();
    logger.info('✅ Redis connection verified (PING→PONG)');
  } catch (err) {
    logger.warn({ err }, '⚠️  Redis unavailable — running without cache');
    throw err;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  await Promise.allSettled([redisClient.quit(), redisSub.quit(), redisPub.quit()]);
  logger.info('Redis connections closed');
};

export default redisClient;
