import { afterAll, afterEach, beforeAll } from 'bun:test';
import { resolve } from 'node:path';

// --- Env de teste: setado ANTES de qualquer import de app/db/auth ---
// (preload roda antes dos arquivos de teste). Override do DATABASE_URL do .env
// pro DB de teste; vars obrigatórias do better-auth/email; observabilidade OFF.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  'postgresql://eco_user:eco_password@localhost:5436/eco_test';
process.env.BETTER_AUTH_SECRET ||= 'test-secret-not-for-prod-0123456789';
process.env.BETTER_AUTH_URL ||= 'http://localhost:3002';
process.env.ORIGIN_ALLOWED ||= 'http://localhost:3000';
process.env.SMTP_FROM ||= 'test@eco.local';
process.env.SENTRY_DSN = '';
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = '';

const MIGRATIONS_FOLDER = resolve(
  import.meta.dir,
  '../../../../packages/db/migrations'
);

// Só ativa o ciclo de DB sob E2E=1 (o runner seta). Assim, se alguém rodar
// `bun test test/e2e` sem o runner, não tenta migrar/truncar sem container.
const isE2E = process.env.E2E === '1';

if (isE2E) {
  beforeAll(async () => {
    await runMigrations();
  });

  afterEach(async () => {
    const { truncateAll } = await import('./helpers/reset');
    await truncateAll();
  });

  afterAll(async () => {
    const { disconnectDatabase } = await import('@pack/db');
    await disconnectDatabase().catch(() => undefined);
  });
}

async function runMigrations(): Promise<void> {
  const url = process.env.DATABASE_URL;
  // Guard: nunca migrar/truncar fora do DB de teste.
  if (!url?.includes('eco_test')) {
    throw new Error(
      `DATABASE_URL precisa apontar pro eco_test nos e2e. Recebido: ${url}`
    );
  }
  const { default: postgres } = await import('postgres');
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { migrate } = await import('drizzle-orm/postgres-js/migrator');

  const client = postgres(url, { max: 1, onnotice: () => undefined });
  await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
  await client.end();
}
