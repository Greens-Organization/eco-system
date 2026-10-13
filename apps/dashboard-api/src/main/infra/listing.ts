import { z } from '@hono/zod-openapi';

/** Query string shared by every list route: `?page&limit&q&status`. */
export function listQuerySchema<const S extends readonly [string, ...string[]]>(
  statuses: S
) {
  return z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1)
      .openapi({ example: 1, description: '1-based page number' }),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10)
      .openapi({ example: 10, description: 'Items per page (max 100)' }),
    q: z
      .string()
      .trim()
      .max(100)
      .optional()
      .openapi({ example: 'ali', description: 'Search by name or email' }),
    status: z.enum(statuses).optional(),
  });
}

/** The page metadata every list response carries. */
export const pageSchema = z.object({
  total: z.number().int().openapi({ example: 24 }),
  page: z.number().int().openapi({ example: 1 }),
  limit: z.number().int().openapi({ example: 10 }),
  pages: z.number().int().openapi({ example: 3 }),
});

export type PageInfo = z.infer<typeof pageSchema>;

/**
 * Filter by a case-insensitive `q` over the given fields and an exact
 * `status`, then cut one page. A page past the end is empty, not an error.
 */
export function listPage<T extends { status: string }>(
  items: readonly T[],
  query: { page: number; limit: number; q?: string; status?: string },
  searchable: (item: T) => string[]
): { items: T[] } & PageInfo {
  const needle = query.q?.toLowerCase();
  const matching = items.filter(
    (item) =>
      (!query.status || item.status === query.status) &&
      (!needle ||
        searchable(item).some((field) => field.toLowerCase().includes(needle)))
  );
  const start = (query.page - 1) * query.limit;
  return {
    items: matching.slice(start, start + query.limit),
    total: matching.length,
    page: query.page,
    limit: query.limit,
    pages: Math.max(1, Math.ceil(matching.length / query.limit)),
  };
}
