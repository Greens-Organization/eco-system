/**
 * The repository policy as code. "Use this template" copies files, not
 * settings or rulesets, so `bun run github:setup` applies these once per
 * repository (and again whenever they change).
 */

/**
 * Merging: squash only, the head branch deleted once merged, never merged
 * automatically. Branch protection lives in the ruleset.
 */
export const REPO_SETTINGS = {
  delete_branch_on_merge: true,
  allow_squash_merge: true,
  allow_merge_commit: false,
  allow_rebase_merge: false,
  allow_auto_merge: false,
  squash_merge_commit_title: 'PR_TITLE',
  squash_merge_commit_message: 'COMMIT_MESSAGES',
} as const;

export type RepoSettings = { [K in keyof typeof REPO_SETTINGS]: unknown };

/** The settings whose current value differs from `REPO_SETTINGS`. */
export function settingsDiff(
  current: Partial<RepoSettings>
): { key: keyof RepoSettings; from: unknown; to: unknown }[] {
  return (Object.keys(REPO_SETTINGS) as (keyof RepoSettings)[])
    .filter((key) => current[key] !== REPO_SETTINGS[key])
    .map((key) => ({ key, from: current[key], to: REPO_SETTINGS[key] }));
}

export type Ruleset = {
  name: string;
  rules: { type: string; parameters?: Record<string, unknown> }[];
};

/** The check names a ruleset requires before merging. */
export function requiredChecks(ruleset: Ruleset): string[] {
  const rule = ruleset.rules.find((r) => r.type === 'required_status_checks');
  const checks = rule?.parameters?.required_status_checks as
    | { context: string }[]
    | undefined;
  return (checks ?? []).map((check) => check.context);
}

/** The check names a workflow's jobs report: a job's `name`, or its key. */
export function workflowCheckNames(workflowYaml: string): string[] {
  const workflow = Bun.YAML.parse(workflowYaml) as {
    jobs?: Record<string, { name?: string }>;
  };
  return Object.entries(workflow.jobs ?? {}).map(
    ([key, job]) => job.name ?? key
  );
}

/**
 * Required checks no workflow job reports. A required check that never
 * runs blocks every pull request forever, so a renamed CI job must fail
 * the setup (and the tests) instead.
 */
export function unreportedChecks(
  ruleset: Ruleset,
  workflowYaml: string
): string[] {
  const reported = new Set(workflowCheckNames(workflowYaml));
  return requiredChecks(ruleset).filter((check) => !reported.has(check));
}
