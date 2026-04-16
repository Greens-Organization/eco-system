import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { connectionString, env } from './pack-env'
import * as schema from './schema';

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}, // silence PostgreSQL notifications
  /**
   * Prepared statements cache compiled queries on the PostgreSQL server for faster execution.
   * Set to `false` for serverless environments or connection pooling.
   * Set to `true` for long-running servers with repetitive queries (better performance).
   */
  prepare: false,
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
