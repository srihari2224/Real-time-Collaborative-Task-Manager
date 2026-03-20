// src/utils/pagination.ts
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export const parsePagination = (query: Record<string, unknown> = {}): PaginationParams => {
  const page = Math.max(1, parseInt(String(query.page ?? 1)) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? 20)) || 20));
  return { page, limit, offset: (page - 1) * limit };
};

export const buildPaginationSQL = (offset: number, limit: number): string =>
  `LIMIT ${limit} OFFSET ${offset}`;

export default { parsePagination, buildPaginationSQL };
