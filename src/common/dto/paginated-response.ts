export interface PaginationMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// Helper function to build paginated response
export function buildPaginatedResponse<T>(
  data: T[],
  totalCount: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      perPage: limit,
    },
  };
}
