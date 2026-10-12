#!/usr/bin/env bun
import { spawnSync } from 'node:child_process';
import { testContainers } from './helpers/containers';

// Runner e2e: sobe pg, roda os testes e2e (E2E=1 + preload do setup) e derruba
// no fim via `using` (mesmo se os testes falharem). Uso: `bun run test:e2e`.
process.exit(run());

function run(): number {
  try {
    using _containers = testContainers.start();

    const extra = process.argv.slice(2);
    const result = spawnSync(
      'bun',
      [
        'test',
        'test/e2e',
        '--preload',
        './test/e2e/setup.ts',
        '--timeout',
        '30000',
        ...extra,
      ],
      { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test', E2E: '1' } }
    );
    return result.status ?? 1;
  } catch (err) {
    console.error('Falha ao subir os containers de teste:', err);
    return 1;
  }
}
