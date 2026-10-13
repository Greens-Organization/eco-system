#!/usr/bin/env bun
import { resolve } from 'node:path';
import { DATABASE_URL } from './stack';

// Browser e2e: brings up the test compose, migrates, builds the dashboard
// (SKIP_BUILD=1 reuses build/), runs Playwright and always tears the
// containers down. Extra arguments go to `playwright test`.
// Usage: `bun run test:browser [-- --headed | -g "profile"]`.

const ROOT = resolve(import.meta.dir, '../../../..');
const COMPOSE = [
  'docker',
  'compose',
  '-f',
  `${ROOT}/infra/docker/docker-compose.test.yml`,
  '-p',
  'eco-browser-test',
];
const DASHBOARD = resolve(import.meta.dir, '../..');

function step(cmd: string[], cwd: string, env: Record<string, string> = {}) {
  const { exitCode } = Bun.spawnSync(cmd, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  if (exitCode !== 0) throw new Error(`${cmd.join(' ')} exited ${exitCode}`);
}

function run(): number {
  try {
    step([...COMPOSE, 'up', '-d', '--wait'], ROOT);
  } catch (err) {
    console.error('Could not start the test containers:', err);
    return 1;
  }
  try {
    step(['bun', 'src/migrate.ts'], `${ROOT}/packages/db`, { DATABASE_URL });
    if (process.env.SKIP_BUILD !== '1')
      step(['bun', 'run', 'build'], DASHBOARD);
    const { exitCode } = Bun.spawnSync(
      ['bunx', 'playwright', 'test', ...process.argv.slice(2)],
      { cwd: DASHBOARD, stdio: ['inherit', 'inherit', 'inherit'] }
    );
    return exitCode ?? 1;
  } catch (err) {
    console.error(err);
    return 1;
  } finally {
    Bun.spawnSync([...COMPOSE, 'down', '--remove-orphans'], { cwd: ROOT });
  }
}

process.exit(run());
