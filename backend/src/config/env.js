// src/config/env.js
// Validates and exports all environment variables with defaults

import 'dotenv/config';
import Joi from 'joi';

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),
  HOST: Joi.string().default('0.0.0.0'),
  API_VERSION: Joi.string().default('v1'),

  // Supabase
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().allow('').default(''),

  // Database
  DATABASE_URL: Joi.string().required(),
  DATABASE_POOL_MIN: Joi.number().default(2),
  DATABASE_POOL_MAX: Joi.number().default(10),
  DATABASE_SSL: Joi.boolean().default(true),

  // Redis
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_TLS: Joi.boolean().default(false),
  REDIS_DB: Joi.number().default(0),

  // AWS S3
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_REGION: Joi.string().default('us-east-1'),
  S3_BUCKET_NAME: Joi.string().required(),
  S3_BUCKET_URL: Joi.string().uri().required(),
  S3_PRESIGNED_URL_EXPIRY: Joi.number().default(3600),

  // AWS SES
  SES_FROM_EMAIL: Joi.string().email().required(),
  SES_FROM_NAME: Joi.string().default('TaskFlow'),
  SES_REGION: Joi.string().default('us-east-1'),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // CORS
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_MAX: Joi.number().default(100),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(60000),

  // WebSocket
  WS_CORS_ORIGIN: Joi.string().default('http://localhost:3000'),

  // Bull
  BULL_REDIS_URL: Joi.string().default('redis://localhost:6379'),

  // Logging
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),

  // File Uploads
  MAX_FILE_SIZE_MB: Joi.number().default(10),
  ALLOWED_FILE_TYPES: Joi.string().default('image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,application/zip'),
}).unknown(true);

const { error, value } = schema.validate(process.env);

if (error) {
  throw new Error(`❌ Environment validation failed:\n${error.details.map(d => `  - ${d.message}`).join('\n')}`);
}

export const env = {
  node: {
    env: value.NODE_ENV,
    port: value.PORT,
    host: value.HOST,
    apiVersion: value.API_VERSION,
    isDev: value.NODE_ENV === 'development',
    isProd: value.NODE_ENV === 'production',
    isTest: value.NODE_ENV === 'test',
  },
  supabase: {
    url: value.SUPABASE_URL,
    anonKey: value.SUPABASE_ANON_KEY,
    serviceRoleKey: value.SUPABASE_SERVICE_ROLE_KEY,
  },
  db: {
    url: value.DATABASE_URL,
    poolMin: value.DATABASE_POOL_MIN,
    poolMax: value.DATABASE_POOL_MAX,
    ssl: value.DATABASE_SSL,
  },
  redis: {
    url: value.REDIS_URL,
    host: value.REDIS_HOST,
    port: value.REDIS_PORT,
    password: value.REDIS_PASSWORD,
    tls: value.REDIS_TLS,
    db: value.REDIS_DB,
  },
  aws: {
    accessKeyId: value.AWS_ACCESS_KEY_ID,
    secretAccessKey: value.AWS_SECRET_ACCESS_KEY,
    region: value.AWS_REGION,
    s3: {
      bucketName: value.S3_BUCKET_NAME,
      bucketUrl: value.S3_BUCKET_URL,
      presignedUrlExpiry: value.S3_PRESIGNED_URL_EXPIRY,
    },
    ses: {
      fromEmail: value.SES_FROM_EMAIL,
      fromName: value.SES_FROM_NAME,
      region: value.SES_REGION,
    },
  },
  jwt: {
    secret: value.JWT_SECRET,
    expiresIn: value.JWT_EXPIRES_IN,
  },
  cors: {
    allowedOrigins: value.ALLOWED_ORIGINS.split(',').map(o => o.trim()),
  },
  rateLimit: {
    max: value.RATE_LIMIT_MAX,
    windowMs: value.RATE_LIMIT_WINDOW_MS,
  },
  ws: {
    corsOrigin: value.WS_CORS_ORIGIN,
  },
  bull: {
    redisUrl: value.BULL_REDIS_URL,
  },
  log: {
    level: value.LOG_LEVEL,
  },
  upload: {
    maxFileSizeMb: value.MAX_FILE_SIZE_MB,
    allowedFileTypes: value.ALLOWED_FILE_TYPES.split(',').map(t => t.trim()),
  },
};

export default env;
