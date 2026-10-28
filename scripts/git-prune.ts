#!/usr/bin/env bun
import { resolve } from 'node:path';
import { $ } from 'bun';
import { isMergedInto, localBranches, verdictFor } from './src/git-branches.ts';

/**
 * Local counterpart of "delete the branch on merge": drops the local
 * branches whose work is already in the default branch (merged or squashed)
 * and the remote-tracking refs of deleted remote branches. Lists only;
 * `--yes` deletes. Never touches the current branch or main, develop and
 * release/*.
 *
 *   bun run git:prune         # list
 *   bun run git:prune --yes   # delete
 */

const root = resolve(import.meta.dir, '..');
const apply = process.argv.includes('--yes');
const git = (...args: string[]) => $`git ${args}`.cwd(root).quiet().nothrow();

// Remote-tracking refs of deleted branches go on every fetch from now on.
await git('config', 'fetch.prune', 'true');
const fetched = await git('fetch', '--prune', 'origin');
if (fetched.exitCode !== 0) {
  console.warn(
    `git fetch failed, comparing with the last fetched state:\n${fetched.stderr.toString().trim()}`
  );
}

const head = (await git('symbolic-ref', '--short', 'refs/remotes/origin/HEAD'))
  .text()
  .trim();
const base = head || 'origin/main';

const toDelete: string[] = [];
const toReview: string[] = [];
for (const branch of await localBranches(root)) {
  const merged = await isMergedInto(root, branch.name, base);
  const verdict = verdictFor(branch, merged);
  if (verdict === 'delete') toDelete.push(branch.name);
  if (verdict === 'review') toReview.push(branch.name);
}

console.log(`compared with ${base}`);
for (const name of toDelete) console.log(`merged    ${name}`);
for (const name of toReview) {
  console.log(`unmerged  ${name}  (its remote branch is gone; check it)`);
}
if (toDelete.length === 0) {
  console.log('nothing to prune');
} else if (apply) {
  const deleted = await git('branch', '-D', ...toDelete);
  console.log(deleted.text().trim() || deleted.stderr.toString().trim());
} else {
  console.log('dry run: bun run git:prune --yes deletes the merged ones');
}
