import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

// pg efêmero pros e2e. Subido/derrubado pelo runner (test/e2e/run.ts).
const COMPOSE_FILE = resolve(
  import.meta.dir,
  '../../../../../infra/docker/docker-compose.test.yml'
);
const PROJECT_NAME = 'eco-api-test';

function compose(args: string[]): void {
  const result = spawnSync(
    'docker',
    ['compose', '-f', COMPOSE_FILE, '-p', PROJECT_NAME, ...args],
    { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }
  );
  if (result.status !== 0) {
    throw new Error(
      `docker compose ${args.join(' ')} falhou (exit ${result.status}): ${
        result.stderr || result.stdout
      }`
    );
  }
}

export const testContainers = {
  /**
   * Sobe o pg (bloqueia até o healthcheck passar) e retorna um `Disposable`:
   * com `using`, o teardown (container + rede; tmpfs some sozinho) roda ao sair
   * do escopo. O `[Symbol.dispose]` engole o próprio erro (vira aviso) pra não
   * mascarar o exit code dos testes.
   */
  start(): Disposable {
    compose(['up', '-d', '--wait']);
    return {
      [Symbol.dispose]() {
        try {
          compose(['down', '--remove-orphans']);
        } catch (err) {
          console.error('Aviso: teardown dos containers falhou:', err);
        }
      },
    };
  },
};
