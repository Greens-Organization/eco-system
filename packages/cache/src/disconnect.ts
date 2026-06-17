import { cache } from './client';

/** Close the connection — call on graceful shutdown. */
export function disconnectCache(): void {
  cache.close();
}
