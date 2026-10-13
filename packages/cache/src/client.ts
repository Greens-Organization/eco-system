import { RedisClient } from 'bun';
import { env } from '../pack-env';

/**
 * Native Bun Redis client (Bun 1.3+, no ioredis/node-redis). Lazily connects on
 * the first command. Reuse this singleton; call `disconnectCache()` on shutdown.
 */
export const cache = new RedisClient(env.REDIS_URL);

export { RedisClient };
