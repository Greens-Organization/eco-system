#!/usr/bin/env bun
import { $, Glob } from 'bun';
import { basename, dirname, resolve } from 'node:path';

/**
 * Limpeza do monorepo: roda `bun run clean` em cada workspace que define
 * o script. Workspaces sem `clean` são pulados (não viram falso positivo).
 * Falhas reais são reportadas com stderr e exit code != 0.
 */

type Status = 'cleaned' | 'skipped' | 'failed';
type Result = { name: string; status: Status; error?: string };

const rootDir = resolve(import.meta.dir, '..');

async function readPackageScripts(
  packageJsonPath: string,
): Promise<Record<string, string> | null> {
  try {
    const pkg = (await Bun.file(packageJsonPath).json()) as {
      scripts?: Record<string, string>;
    };
    return pkg.scripts ?? null;
  } catch {
    return null;
  }
}

async function cleanPackage(packageJsonPath: string): Promise<Result> {
  const dir = dirname(packageJsonPath);
  const name = dir === rootDir ? '(root)' : basename(dir);
  const scripts = await readPackageScripts(packageJsonPath);

  if (!scripts?.clean) {
    return { name, status: 'skipped' };
  }

  const result = await $`bun run clean`.cwd(dir).nothrow().quiet();
  if (result.exitCode !== 0) {
    const stderr = result.stderr.toString().trim().slice(0, 200);
    return {
      name,
      status: 'failed',
      error: stderr || `exit ${result.exitCode}`,
    };
  }
  return { name, status: 'cleaned' };
}

async function main(): Promise<void> {
  const start = performance.now();
  console.log('🧹 Iniciando limpeza do monorepo...\n');

  const glob = new Glob('{packages,apps}/*/package.json');
  const workspaces = await Array.fromAsync(
    glob.scan({ cwd: rootDir, absolute: true }),
  );

  console.log(
    `📦 ${workspaces.length} workspaces encontrados — limpando em paralelo...\n`,
  );

  const results = await Promise.all([
    cleanPackage(`${rootDir}/package.json`),
    ...workspaces.map(cleanPackage),
  ]);

  const cleaned = results.filter((r) => r.status === 'cleaned');
  const skipped = results.filter((r) => r.status === 'skipped');
  const failed = results.filter((r) => r.status === 'failed');

  for (const r of cleaned) console.log(`  ✅ ${r.name}`);
  for (const r of skipped) console.log(`  ⏭  ${r.name} (sem script clean)`);
  for (const r of failed) console.log(`  ❌ ${r.name} — ${r.error}`);

  const elapsed = ((performance.now() - start) / 1000).toFixed(1);
  console.log(
    `\n✨ ${cleaned.length} limpos, ${skipped.length} pulados, ${failed.length} falharam em ${elapsed}s`,
  );

  if (failed.length > 0) process.exit(1);
}

main();
