import { RedisClient } from 'bun';
import { env } from './pack-env';

/**
 * Native Bun Redis client (Bun 1.3+, no ioredis/node-redis). Lazily connects on
 * the first command. Reuse this singleton; call `disconnectCache()` on shutdown.
 */
export const cache = new RedisClient(env.REDIS_URL);

/** Read + JSON-parse a cached value. Returns null on miss (or a cached null). */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await cache.get(key);
  return raw === null ? null : (JSON.parse(raw) as T);
}

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

/** Delete one or more keys; returns the number removed. */
export function cacheDel(...keys: string[]): Promise<number> {
  return keys.length > 0 ? cache.del(...keys) : Promise.resolve(0);
}

/** Whether a key exists. */
export function cacheHas(key: string): Promise<boolean> {
  return cache.exists(key);
}

/**
 * Cache-aside: return the cached value, or produce it, store it (with TTL), and
 * return it. A produced `null`/`undefined` is not cached.
 */
export async function cacheRemember<T>(
  key: string,
  ttlSeconds: number,
  produce: () => Promise<T>
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await produce();
  if (value !== null && value !== undefined) {
    await cacheSet(key, value, ttlSeconds);
  }
  return value;
}

/** Close the connection — call on graceful shutdown. */
export function disconnectCache(): void {
  cache.close();
}

export { RedisClient };
