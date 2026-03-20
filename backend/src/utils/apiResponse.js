// src/utils/apiResponse.js
// Standardized API response helpers

/**
 * Send a success response
 */
export const success = (reply, data = null, message = 'Success', statusCode = 200) => {
  return reply.code(statusCode).send({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send an error response
 */
export const error = (reply, message = 'An error occurred', statusCode = 500, errors = null) => {
  return reply.code(statusCode).send({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send a paginated response
 */
export const paginated = (reply, data, pagination, message = 'Success') => {
  return reply.code(200).send({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNextPage: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrevPage: pagination.page > 1,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Common error shortcuts
 */
export const notFound = (reply, resource = 'Resource') =>
  error(reply, `${resource} not found`, 404);

export const unauthorized = (reply, message = 'Unauthorized') =>
  error(reply, message, 401);

export const forbidden = (reply, message = 'Forbidden') =>
  error(reply, message, 403);

export const badRequest = (reply, message = 'Bad request', errors = null) =>
  error(reply, message, 400, errors);

export const conflict = (reply, message = 'Conflict') =>
  error(reply, message, 409);

export const created = (reply, data, message = 'Created successfully') =>
  success(reply, data, message, 201);

export default { success, error, paginated, notFound, unauthorized, forbidden, badRequest, conflict, created };
