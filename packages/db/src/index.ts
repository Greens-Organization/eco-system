import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { connectionString, env } from '../pack-env';
import * as schema from '../schema';

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}, // silence PostgreSQL notifications
  /**
   * Prepared statements cache compiled queries on the server for faster repeat
   * execution. `true` suits the long-running API; set `false` behind a
   * transaction-pooling proxy (PgBouncer txn mode / Supabase pooler) or in
   * serverless, where prepared statements don't survive the connection.
   */
  prepare: true,
  // Connection settings executed when establishing the connection
  // connection: {
  //   TimeZone: env.TZ,
  // },
});

export const db = drizzle({
  client,
  schema,
  logger: env.DRIZZLE_SQL_LOGS,
  casing: 'snake_case',
});

export async function disconnectDatabase() {
  try {
    // Gracefully close all connections from the pool
    // Waits for active queries to finish before closing
    await db.$client.end();
  } catch (error) {
    throw new Error('Failed to disconnect database', { cause: error });
  }
}

/**
 * Liveness ping for the readiness probe. Reuses the shared pool (no new
 * connection). Throws if the database is unreachable.
 */
export async function pingDatabase(): Promise<void> {
  await db.$client`select 1`;
}
