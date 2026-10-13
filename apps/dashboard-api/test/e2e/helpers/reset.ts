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

/**
 * Esvazia o Redis de teste entre testes (sessões e contadores do rate limit).
 * Guard: só a porta do compose de teste, nunca o Redis de dev.
 */
export async function flushRedis(): Promise<void> {
  if (!process.env.REDIS_URL?.endsWith(':6380')) {
    throw new Error(
      `REDIS_URL precisa apontar pro Redis de teste. Recebido: ${process.env.REDIS_URL}`
    );
  }
  const { cache } = await import('@pack/cache');
  await cache.send('FLUSHDB', []);
}
