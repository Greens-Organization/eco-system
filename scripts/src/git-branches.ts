import { $ } from 'bun';

/** The long-lived branches (the ruleset's): never pruned. */
export function isProtected(branch: string): boolean {
  return (
    branch === 'main' || branch === 'develop' || branch.startsWith('release/')
  );
}

export type LocalBranch = {
  name: string;
  current: boolean;
  /** Its upstream was deleted on the remote (`[gone]`). */
  gone: boolean;
};

const git = (cwd: string, ...args: string[]) =>
  $`git ${args}`.cwd(cwd).quiet().nothrow();

export async function localBranches(cwd: string): Promise<LocalBranch[]> {
  const out = await git(
    cwd,
    'for-each-ref',
    '--format=%(refname:short)%09%(upstream:track)%09%(HEAD)',
    'refs/heads'
  );
  return out
    .text()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name = '', track = '', head = ''] = line.split('\t');
      return { name, gone: track === '[gone]', current: head === '*' };
    });
}

/**
 * Whether `branch`'s work is in `base`: merged (an ancestor) or squashed.
 * A squash merge leaves no ancestry, so `git branch --merged` misses it:
 * the branch's whole diff is squashed into one throwaway commit on top of
 * the merge base, and `git cherry` looks for an equal patch in `base`.
 */
export async function isMergedInto(
  cwd: string,
  branch: string,
  base: string
): Promise<boolean> {
  const ancestor = await git(cwd, 'merge-base', '--is-ancestor', branch, base);
  if (ancestor.exitCode === 0) return true;

  const mergeBase = (await git(cwd, 'merge-base', base, branch)).text().trim();
  if (!mergeBase) return false;
  const tree = (await git(cwd, 'rev-parse', `${branch}^{tree}`)).text().trim();
  // Unsigned and unreferenced: a dangling object `git gc` drops. Its own
  // identity, so it works where none is configured (a CI runner).
  const squashed = (
    await git(
      cwd,
      '-c',
      'user.name=git-prune',
      '-c',
      'user.email=git-prune@localhost',
      'commit-tree',
      '--no-gpg-sign',
      tree,
      '-p',
      mergeBase,
      '-m',
      'squash'
    )
  )
    .text()
    .trim();
  const cherry = (await git(cwd, 'cherry', base, squashed)).text().trim();
  return cherry.startsWith('-');
}

export type Verdict = 'delete' | 'review' | 'keep';

/**
 * Merged branches go; a branch whose remote is gone without its work in
 * the base is listed for a person to look at; the rest stays.
 */
export function verdictFor(branch: LocalBranch, merged: boolean): Verdict {
  if (branch.current || isProtected(branch.name)) return 'keep';
  if (merged) return 'delete';
  return branch.gone ? 'review' : 'keep';
}
