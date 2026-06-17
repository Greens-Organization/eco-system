import { cacheGet } from './get';
import { cacheSet } from './set';

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
