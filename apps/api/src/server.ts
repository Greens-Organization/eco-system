// First import: boots the observability SDKs (Sentry/OTel) before the app.
import '@pack/observability/instrumentation';
import { log } from '@pack/observability/logger';
import { env } from '@/core/env';
import app from '@/main/app';
import {
  createGracefulShutdown,
  shouldRegisterGracefulShutdown,
} from '@/main/infra/graceful-shutdown';
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

    // Runs in ALL environments (essential in prod/k8s to drain on SIGTERM);
    // opt out only via SKIP_GRACEFUL. (Fix for the prod registration bug, D5.)
    if (shouldRegisterGracefulShutdown({ skip: env.SKIP_GRACEFUL })) {
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
