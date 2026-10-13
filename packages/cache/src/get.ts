import { cache } from './client';

/** Read + JSON-parse a cached value. Returns null on miss (or a cached null). */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await cache.get(key);
  return raw === null ? null : (JSON.parse(raw) as T);
}
