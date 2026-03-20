// src/utils/apiResponse.ts
import type { FastifyReply } from 'fastify';

export const success = <T>(reply: FastifyReply, data: T | null = null, message = 'Success', statusCode = 200) =>
  reply.code(statusCode).send({ success: true, message, data, timestamp: new Date().toISOString() });

export const error = (reply: FastifyReply, message = 'An error occurred', statusCode = 500, errors: unknown = null) =>
  reply.code(statusCode).send({ success: false, message, errors, timestamp: new Date().toISOString() });

export const paginated = <T>(reply: FastifyReply, data: T[], pagination: { page: number; limit: number; total: number }, message = 'Success') =>
  reply.code(200).send({
    success: true, message, data, timestamp: new Date().toISOString(),
    pagination: {
      page: pagination.page, limit: pagination.limit, total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNextPage: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrevPage: pagination.page > 1,
    },
  });

export const notFound    = (reply: FastifyReply, resource = 'Resource') => error(reply, `${resource} not found`, 404);
export const unauthorized = (reply: FastifyReply, message = 'Unauthorized') => error(reply, message, 401);
export const forbidden   = (reply: FastifyReply, message = 'Forbidden') => error(reply, message, 403);
export const badRequest  = (reply: FastifyReply, message = 'Bad request', errors: unknown = null) => error(reply, message, 400, errors);
export const conflict    = (reply: FastifyReply, message = 'Conflict') => error(reply, message, 409);
export const created     = <T>(reply: FastifyReply, data: T, message = 'Created successfully') => success(reply, data, message, 201);

export default { success, error, paginated, notFound, unauthorized, forbidden, badRequest, conflict, created };
