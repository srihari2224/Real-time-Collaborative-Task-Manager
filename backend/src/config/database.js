// src/config/database.js
// PostgreSQL connection pool using the 'pg' library

import pg from 'pg';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: env.db.url,
  min: env.db.poolMin,
  max: env.db.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: env.db.ssl
    ? { rejectUnauthorized: false }  // Supabase uses SSL; set to true and provide CA cert in production
    : false,
});

// Log connection events
pool.on('connect', () => {
  logger.debug('New PostgreSQL client connected');
});

pool.on('error', (err) => {
  logger.error({ err }, 'PostgreSQL pool error — unexpected error on idle client');
  process.exit(-1);
});

// Helper: run a query
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug({ query: text, duration, rows: result.rowCount }, 'Executed query');
    return result;
  } catch (err) {
    logger.error({ err, query: text, params }, 'Query error');
    throw err;
  }
};

// Helper: get a client for transactions
export const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  // Patch to detect long-running transactions
  const timeout = setTimeout(() => {
    logger.warn('A client has been checked out for more than 5 seconds!');
  }, 5000);

  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = originalRelease;
    return client.release();
  };

  return client;
};

// Helper: run queries within a transaction
export const withTransaction = async (callback) => {
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

// Test connectivity on startup
export const connectDatabase = async () => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    logger.info({ time: result.rows[0].current_time }, '✅ PostgreSQL connected');
  } catch (err) {
    logger.error({ err }, '❌ PostgreSQL connection failed');
    throw err;
  }
};

export default { query, getClient, withTransaction, connectDatabase, pool };
