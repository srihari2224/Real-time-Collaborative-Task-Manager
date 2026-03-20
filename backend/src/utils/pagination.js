// src/utils/pagination.js
// Pagination utilities

/**
 * Parse pagination query params
 * @param {Object} query
 * @returns {{ page: number, limit: number, offset: number }}
 */
export const parsePagination = (query = {}) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Build SQL pagination clause
 */
export const buildPaginationSQL = (offset, limit) => `LIMIT ${limit} OFFSET ${offset}`;

export default { parsePagination, buildPaginationSQL };
