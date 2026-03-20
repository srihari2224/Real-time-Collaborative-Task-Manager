// src/config/database.ts
import pg from 'pg';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.db.url,
  min: env.db.poolMin,
  max: env.db.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: env.db.ssl ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => logger.debug('New PostgreSQL client connected'));
pool.on('error', (err) => {
  logger.error({ err }, 'PostgreSQL pool idle client error');
});

export const query = async (text: string, params?: unknown[]): Promise<pg.QueryResult> => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    logger.debug({ query: text, duration: Date.now() - start, rows: result.rowCount }, 'DB query');
    return result;
  } catch (err) {
    logger.error({ err, query: text }, 'DB query error');
    throw err;
  }
};

export const getClient = async (): Promise<pg.PoolClient> => {
  const client = await pool.connect();
  const timeout = setTimeout(() => {
    logger.warn('A DB client has been checked out for more than 5 seconds!');
  }, 5000);
  const originalRelease = client.release.bind(client);
  client.release = (...args: Parameters<typeof originalRelease>) => {
    clearTimeout(timeout);
    return originalRelease(...args);
  };
  return client;
};

export const withTransaction = async <T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Transaction rolled back');
    throw err;
  } finally {
    client.release();
  }
};

export const connectDatabase = async (): Promise<void> => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    logger.info({ time: result.rows[0].current_time }, '✅ PostgreSQL connected');
  } catch (err) {
    logger.error({ err }, '❌ PostgreSQL connection failed');
    throw err;
  }
};

export default { query, getClient, withTransaction, connectDatabase, pool };
