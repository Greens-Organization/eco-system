import { log } from '@pack/observability/logger';
import { env, isDevelopment, isLocal } from '@/core/env';
import app from '@/main/app';
import { createGracefulShutdown } from '@/main/infra/graceful-shutdown';
import { setup } from '@/main/setup';

async function main() {
  try {
    // Setup Timezone before any date operations
    setup.timezone();

    const server = Bun.serve({
      port: env.PORT,
      development: false,
      fetch: app.fetch,
    });

    if ((isLocal || isDevelopment) && env.SKIP_GRACEFUL) {
      createGracefulShutdown(server);
    }

    setup.logInfo();
  } catch (e) {
    log.error(e, 'Error during startup');
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
