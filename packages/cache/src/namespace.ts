import { cache } from './client';

// INCR, and set the TTL only when the counter is created, in one round trip:
// a crash between a separate INCR and EXPIRE would leave a counter that never
// expires.
const INCREMENT_WITH_TTL = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return n`;

export type CacheNamespace = {
  readonly prefix: string;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  getAndDelete(key: string): Promise<string | null>;
  increment(key: string, ttlSeconds: number): Promise<number>;
  /** Seconds left before `key` expires; 0 when it is missing or has no TTL. */
  ttl(key: string): Promise<number>;
};

/**
 * Raw string access to keys under `<name>:`. Every consumer of the shared
 * Redis gets its own namespace, so a `KEYS name:*` shows exactly what one
 * feature stores and nothing collides.
 */
export function createNamespace(name: string): CacheNamespace {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(`Invalid cache namespace: "${name}"`);
  }
  const prefix = `${name}:`;
  const k = (key: string) => prefix + key;

  return {
    prefix,
    get: (key) => cache.get(k(key)),
    async set(key, value, ttlSeconds) {
      if (ttlSeconds && ttlSeconds > 0) {
        await cache.set(k(key), value, 'EX', ttlSeconds);
      } else {
        await cache.set(k(key), value);
      }
    },
    async del(key) {
      await cache.del(k(key));
    },
    getAndDelete: (key) => cache.getdel(k(key)),
    async increment(key, ttlSeconds) {
      const n = await cache.send('EVAL', [
        INCREMENT_WITH_TTL,
        '1',
        k(key),
        String(ttlSeconds),
      ]);
      return Number(n);
    },
    async ttl(key) {
      return Math.max(0, await cache.ttl(k(key)));
    },
  };
}
