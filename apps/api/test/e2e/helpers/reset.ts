import { db } from '@pack/db';
import { sql } from 'drizzle-orm';

/**
 * Zera todas as tabelas do schema `public` (exceto a meta do drizzle) entre
 * testes. `TRUNCATE ... CASCADE` resolve as FKs; `RESTART IDENTITY` reseta
 * sequences. Chamado no `afterEach` do setup e2e.
 */
export async function truncateAll(): Promise<void> {
  const rows = (await db.execute<{ tablename: string }>(sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE 'drizzle%'
  `)) as unknown as { tablename: string }[];

  const tables = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
  if (!tables) return;

  await db.execute(
    sql.raw(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`)
  );
}
