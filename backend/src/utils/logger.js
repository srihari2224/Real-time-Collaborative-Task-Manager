// src/utils/logger.js
// Pino logger — structured JSON logging, pretty-printed in dev

import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.log.level,
  ...(env.node.isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  base: {
    env: env.node.env,
    service: 'taskflow-backend',
  },
  redact: {
    paths: ['req.headers.authorization', 'password', 'token', 'secret'],
    censor: '[REDACTED]',
  },
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        ip: req.ip,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
    err: pino.stdSerializers.err,
  },
});

export default logger;
