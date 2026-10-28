#!/usr/bin/env bun
import { resolve } from 'node:path';
import { $ } from 'bun';
import {
  REPO_SETTINGS,
  type RepoSettings,
  type Ruleset,
  settingsDiff,
  unreportedChecks,
} from './src/github-policy.ts';

/**
 * Applies the repository policy to the GitHub repository of this checkout:
 * squash-only merges, head branches deleted on merge, no auto-merge, and the
 * protected-branches ruleset (main, develop, release/**: no deletion, no
 * force push, pull request only, CI green). Needs `gh` signed in as a repo
 * admin. Idempotent: run it again after changing the policy.
 *
 *   bun run github:setup --dry-run   # show what would change
 *   bun run github:setup             # apply
 */

const root = resolve(import.meta.dir, '..');
const dryRun = process.argv.includes('--dry-run');

const gh = async <T>(path: string, method = 'GET', body?: unknown) => {
  const input = body === undefined ? '' : JSON.stringify(body);
  const out =
    body === undefined
      ? await $`gh api -X ${method} ${path}`.quiet().text()
      : await $`gh api -X ${method} ${path} --input - < ${new Response(input)}`
          .quiet()
          .text();
  return JSON.parse(out) as T;
};

const repo =
  (await $`gh repo view --json nameWithOwner,visibility,viewerPermission`
    .cwd(root)
    .quiet()
    .json()) as {
    nameWithOwner: string;
    visibility: string;
    viewerPermission: string;
  };

console.log(`${repo.nameWithOwner} (${repo.visibility.toLowerCase()})`);
if (repo.viewerPermission !== 'ADMIN') {
  console.error('Repository settings and rulesets need admin access.');
  process.exit(1);
}
if (repo.visibility !== 'PUBLIC') {
  console.warn(
    'Private repository: rulesets are enforced only on GitHub Pro, Team or ' +
      'Enterprise. On GitHub Free the branches stay unprotected.'
  );
}

// Ruleset first: the API is likelier to refuse it, and then nothing
// has changed yet.
const ruleset = (await Bun.file(
  resolve(root, '.github/rulesets/protected-branches.json')
).json()) as Ruleset;
const unreported = unreportedChecks(
  ruleset,
  await Bun.file(resolve(root, '.github/workflows/ci.yml')).text()
);
if (unreported.length > 0) {
  console.error(
    `ruleset requires checks no CI job reports: ${unreported.join(', ')}`
  );
  process.exit(1);
}

const existing = (
  await gh<{ id: number; name: string }[]>(
    `repos/${repo.nameWithOwner}/rulesets`
  )
).find((r) => r.name === ruleset.name);
const action = existing ? `update #${existing.id}` : 'create';
console.log(`ruleset "${ruleset.name}": ${action}`);
if (!dryRun) {
  if (existing) {
    await gh(
      `repos/${repo.nameWithOwner}/rulesets/${existing.id}`,
      'PUT',
      ruleset
    );
  } else {
    await gh(`repos/${repo.nameWithOwner}/rulesets`, 'POST', ruleset);
  }
}

// Repository settings
const current = await gh<RepoSettings>(`repos/${repo.nameWithOwner}`);
const changes = settingsDiff(current);
if (changes.length === 0) {
  console.log('settings: up to date');
} else {
  for (const { key, from, to } of changes) {
    console.log(`settings: ${key} ${String(from)} -> ${String(to)}`);
  }
  if (!dryRun) {
    await gh(`repos/${repo.nameWithOwner}`, 'PATCH', REPO_SETTINGS);
  }
}

console.log(dryRun ? 'dry run: nothing changed' : 'done');
