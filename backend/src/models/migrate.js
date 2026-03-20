// src/models/migrate.js
// Reads schema.sql and runs it against the connected PostgreSQL database

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { connectDatabase, query } from '../config/database.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const run = async () => {
  logger.info('Running database migrations...');
  await connectDatabase();

  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await query(sql);

  logger.info('✅ Migration completed successfully');
  process.exit(0);
};

run().catch((err) => {
  logger.error({ err }, '❌ Migration failed');
  process.exit(1);
});
