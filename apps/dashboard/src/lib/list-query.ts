/** What a list page asks the API for, read from its own URL. */
export type ListQuery<S extends string> = {
  page: number;
  q?: string;
  status?: S;
};

/**
 * Read `?page&q&status` leniently: a value the API would reject (page 0,
 * an unknown status) is dropped rather than turned into an error page —
 * the URL is user-editable, and the list still renders.
 */
export function readListQuery<S extends string>(
  url: URL,
  statuses: readonly S[]
): ListQuery<S> {
  const rawPage = Number(url.searchParams.get('page'));
  const q = url.searchParams.get('q')?.trim().slice(0, 100) || undefined;
  const rawStatus = url.searchParams.get('status');
  const status = statuses.find((s) => s === rawStatus);
  return {
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
  };
}

/** The same URL with some params replaced; `undefined` removes one. */
export function withParams(
  url: URL,
  changes: Record<string, string | number | undefined>
): string {
  const next = new URL(url);
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === '') next.searchParams.delete(key);
    else next.searchParams.set(key, String(value));
  }
  return `${next.pathname}${next.search}`;
}

/** Query params in the shape the Hono client wants (strings only). */
export function toApiQuery<S extends string>(
  query: ListQuery<S>,
  limit: number
): Record<string, string> {
  return {
    page: String(query.page),
    limit: String(limit),
    ...(query.q ? { q: query.q } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
}
