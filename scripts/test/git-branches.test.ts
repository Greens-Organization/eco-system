import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { $ } from 'bun';
import {
  isMergedInto,
  isProtected,
  localBranches,
  verdictFor,
} from '../src/git-branches.ts';

let repo = '';
const git = (...args: string[]) =>
  $`git -c user.name=test -c user.email=test@eco.local -c commit.gpgsign=false ${args}`
    .cwd(repo)
    .quiet();
const commit = async (file: string, text: string) => {
  await Bun.write(join(repo, file), text);
  await git('add', file);
  await git('commit', '-m', `edit ${file}`);
};

const saved = {
  global: process.env.GIT_CONFIG_GLOBAL,
  nosystem: process.env.GIT_CONFIG_NOSYSTEM,
};

// main <- feature-merged (merge), feature-squashed (squash), feature-open.
// No global or system git config, as on a CI runner: no identity, no
// signing setup.
beforeAll(async () => {
  process.env.GIT_CONFIG_GLOBAL = '/dev/null';
  process.env.GIT_CONFIG_NOSYSTEM = '1';
  repo = mkdtempSync(join(tmpdir(), 'git-prune-'));
  await git('init', '-q', '-b', 'main');
  await commit('a.txt', 'a');

  await git('switch', '-q', '-c', 'feature-merged');
  await commit('b.txt', 'b');
  await git('switch', '-q', 'main');
  await git('merge', '-q', '--no-ff', '-m', 'merge', 'feature-merged');

  await git('switch', '-q', '-c', 'feature-squashed');
  await commit('c.txt', 'c1');
  await commit('c.txt', 'c2');
  await git('switch', '-q', 'main');
  await git('merge', '-q', '--squash', 'feature-squashed');
  await git('commit', '-q', '-m', 'squashed');

  await git('switch', '-q', '-c', 'feature-open');
  await commit('d.txt', 'd');
  await git('switch', '-q', 'main');
});

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
  for (const [key, value] of [
    ['GIT_CONFIG_GLOBAL', saved.global],
    ['GIT_CONFIG_NOSYSTEM', saved.nosystem],
  ] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('isMergedInto', () => {
  test('a merged branch is in main', async () => {
    expect(await isMergedInto(repo, 'feature-merged', 'main')).toBe(true);
  });

  test('a squash-merged branch is in main (git branch --merged says no)', async () => {
    const merged = (await git('branch', '--merged', 'main')).text();
    expect(merged).not.toContain('feature-squashed');
    expect(await isMergedInto(repo, 'feature-squashed', 'main')).toBe(true);
  });

  test('a branch with new work is not', async () => {
    expect(await isMergedInto(repo, 'feature-open', 'main')).toBe(false);
  });
});

describe('localBranches', () => {
  test('lists every branch and marks the current one', async () => {
    const branches = await localBranches(repo);
    expect(branches.map((b) => b.name).sort()).toEqual([
      'feature-merged',
      'feature-open',
      'feature-squashed',
      'main',
    ]);
    expect(branches.find((b) => b.current)?.name).toBe('main');
  });
});

describe('verdictFor', () => {
  const branch = { name: 'feature', current: false, gone: false };

  test('merged goes, unmerged stays, a gone remote asks for a look', () => {
    expect(verdictFor(branch, true)).toBe('delete');
    expect(verdictFor(branch, false)).toBe('keep');
    expect(verdictFor({ ...branch, gone: true }, false)).toBe('review');
  });

  test('the current branch and the protected ones always stay', () => {
    expect(verdictFor({ ...branch, current: true }, true)).toBe('keep');
    for (const name of ['main', 'develop', 'release/1.2']) {
      expect(isProtected(name)).toBe(true);
      expect(verdictFor({ ...branch, name }, true)).toBe('keep');
    }
    expect(isProtected('releases')).toBe(false);
  });
});
