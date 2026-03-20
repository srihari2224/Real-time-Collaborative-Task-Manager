// src/config/env.ts
// Validates and exports all environment variables with safe defaults

import 'dotenv/config';
import Joi from 'joi';

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),
  HOST: Joi.string().default('0.0.0.0'),
  API_VERSION: Joi.string().default('v1'),

  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().allow('').default(''),

  DATABASE_URL: Joi.string().required(),
  DATABASE_POOL_MIN: Joi.number().default(2),
  DATABASE_POOL_MAX: Joi.number().default(10),
  DATABASE_SSL: Joi.boolean().default(true),

  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_TLS: Joi.boolean().default(false),
  REDIS_DB: Joi.number().default(0),

  AWS_ACCESS_KEY_ID: Joi.string().allow('').default(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
  AWS_REGION: Joi.string().default('us-east-1'),
  S3_BUCKET_NAME: Joi.string().allow('').default(''),
  S3_BUCKET_URL: Joi.string().uri().allow('').default('https://example.com'),
  S3_PRESIGNED_URL_EXPIRY: Joi.number().default(3600),

  SES_FROM_EMAIL: Joi.string().email().allow('').default('noreply@taskflow.app'),
  SES_FROM_NAME: Joi.string().default('TaskFlow'),
  SES_REGION: Joi.string().default('us-east-1'),

  JWT_SECRET: Joi.string().min(1).allow('').default('taskflow-dev-secret-change-in-production'),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),
  RATE_LIMIT_MAX: Joi.number().default(100),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(60000),
  WS_CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  BULL_REDIS_URL: Joi.string().default('redis://localhost:6379'),
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),
  MAX_FILE_SIZE_MB: Joi.number().default(10),
  ALLOWED_FILE_TYPES: Joi.string().default(
    'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,application/zip'
  ),
}).unknown(true);

const { error, value } = schema.validate(process.env);
if (error) {
  throw new Error(
    `❌ Environment validation failed:\n${error.details.map((d) => `  - ${d.message}`).join('\n')}`
  );
}

export const env = {
  node: {
    env: value.NODE_ENV as string,
    port: value.PORT as number,
    host: value.HOST as string,
    apiVersion: value.API_VERSION as string,
    isDev: value.NODE_ENV === 'development',
    isProd: value.NODE_ENV === 'production',
    isTest: value.NODE_ENV === 'test',
  },
  supabase: {
    url: value.SUPABASE_URL as string,
    anonKey: value.SUPABASE_ANON_KEY as string,
    serviceRoleKey: value.SUPABASE_SERVICE_ROLE_KEY as string,
  },
  db: {
    url: value.DATABASE_URL as string,
    poolMin: value.DATABASE_POOL_MIN as number,
    poolMax: value.DATABASE_POOL_MAX as number,
    ssl: value.DATABASE_SSL as boolean,
  },
  redis: {
    url: value.REDIS_URL as string,
    host: value.REDIS_HOST as string,
    port: value.REDIS_PORT as number,
    password: value.REDIS_PASSWORD as string,
    tls: value.REDIS_TLS as boolean,
    db: value.REDIS_DB as number,
  },
  aws: {
    accessKeyId: value.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: value.AWS_SECRET_ACCESS_KEY as string,
    region: value.AWS_REGION as string,
    s3: {
      bucketName: value.S3_BUCKET_NAME as string,
      bucketUrl: value.S3_BUCKET_URL as string,
      presignedUrlExpiry: value.S3_PRESIGNED_URL_EXPIRY as number,
    },
    ses: {
      fromEmail: value.SES_FROM_EMAIL as string,
      fromName: value.SES_FROM_NAME as string,
      region: value.SES_REGION as string,
    },
  },
  jwt: {
    secret: value.JWT_SECRET as string,
    expiresIn: value.JWT_EXPIRES_IN as string,
  },
  cors: {
    allowedOrigins: (value.ALLOWED_ORIGINS as string).split(',').map((o: string) => o.trim()),
  },
  rateLimit: {
    max: value.RATE_LIMIT_MAX as number,
    windowMs: value.RATE_LIMIT_WINDOW_MS as number,
  },
  ws: { corsOrigin: value.WS_CORS_ORIGIN as string },
  bull: { redisUrl: value.BULL_REDIS_URL as string },
  log: { level: value.LOG_LEVEL as string },
  upload: {
    maxFileSizeMb: value.MAX_FILE_SIZE_MB as number,
    allowedFileTypes: (value.ALLOWED_FILE_TYPES as string).split(',').map((t: string) => t.trim()),
  },
} as const;

export type Env = typeof env;
export default env;
