import { disconnectDatabase } from '../index';
import { seedAdmin } from './admin.seed';

// A failed seed must fail the command (and `bun run setup`), not print the
// error and exit 0.
try {
  console.log('[seed] Starting...');
  await seedAdmin();
  console.log('[seed] All done.');
} catch (error) {
  console.error(
    '[seed] Failed:',
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
