import { cache } from './client';

/** Whether a key exists. */
export function cacheHas(key: string): Promise<boolean> {
  return cache.exists(key);
}
