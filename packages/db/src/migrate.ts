import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { connectionString } from '../pack-env';

/**
 * Apply pending migrations with drizzle-orm's migrator — a runtime
 * dependency, unlike drizzle-kit — so a deploy can run it from the API's
 * build image (the compose `migrate` service) before the API starts.
 * Development keeps `bun run db:migrate` (drizzle-kit).
 */
const migrationsFolder = resolve(import.meta.dir, '../migrations');
const client = postgres(connectionString, {
  max: 1,
  onnotice: () => undefined,
});

try {
  await migrate(drizzle(client), { migrationsFolder });
  console.log('[migrate] Database is up to date.');
} catch (error) {
  console.error(
    '[migrate] Failed:',
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
