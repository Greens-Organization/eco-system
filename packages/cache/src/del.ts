import { cache } from './client';

/** Delete one or more keys; returns the number removed. */
export function cacheDel(...keys: string[]): Promise<number> {
  return keys.length > 0 ? cache.del(...keys) : Promise.resolve(0);
}
