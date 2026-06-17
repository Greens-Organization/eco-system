import { cache } from './client';

/** JSON-stringify + store, optionally with a TTL in seconds (atomic SET EX). */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  const raw = JSON.stringify(value);
  if (ttlSeconds && ttlSeconds > 0) {
    await cache.set(key, raw, 'EX', ttlSeconds);
  } else {
    await cache.set(key, raw);
  }
}
