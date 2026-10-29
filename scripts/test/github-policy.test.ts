import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import {
  needsPaidPlan,
  REPO_SETTINGS,
  type Ruleset,
  requiredChecks,
  settingsDiff,
  unreportedChecks,
  workflowCheckNames,
} from '../src/github-policy.ts';

const root = resolve(import.meta.dir, '../..');
const ruleset = (await Bun.file(
  resolve(root, '.github/rulesets/protected-branches.json')
).json()) as Ruleset & {
  bypass_actors: unknown[];
  conditions: { ref_name: { include: string[] } };
};
const ciYaml = await Bun.file(resolve(root, '.github/workflows/ci.yml')).text();

describe('the committed policy', () => {
  test('every required check is a job the CI runs', () => {
    // A renamed job would leave a check nobody reports: no PR could merge.
    expect(unreportedChecks(ruleset, ciYaml)).toEqual([]);
    expect(requiredChecks(ruleset)).toHaveLength(
      workflowCheckNames(ciYaml).length
    );
  });

  test('main, develop and release/** are protected, with no bypass', () => {
    expect(ruleset.conditions.ref_name.include).toEqual(
      expect.arrayContaining([
        'refs/heads/main',
        'refs/heads/develop',
        'refs/heads/release/**',
      ])
    );
    // A bypass lets the merge of a protected head branch delete it.
    expect(ruleset.bypass_actors).toEqual([]);
    expect(ruleset.rules.map((r) => r.type)).toEqual(
      expect.arrayContaining([
        'deletion',
        'non_fast_forward',
        'pull_request',
        'required_status_checks',
      ])
    );
  });

  test('the ruleset and the repo settings agree on squash only', () => {
    const pr = ruleset.rules.find((r) => r.type === 'pull_request');
    expect(pr?.parameters?.allowed_merge_methods).toEqual(['squash']);
    expect(REPO_SETTINGS).toMatchObject({
      allow_squash_merge: true,
      allow_merge_commit: false,
      allow_rebase_merge: false,
      allow_auto_merge: false,
      delete_branch_on_merge: true,
    });
  });
});

describe('settingsDiff', () => {
  test('lists only what differs', () => {
    const diff = settingsDiff({
      ...REPO_SETTINGS,
      delete_branch_on_merge: false,
    });
    expect(diff).toEqual([
      { key: 'delete_branch_on_merge', from: false, to: true },
    ]);
    expect(settingsDiff({ ...REPO_SETTINGS })).toEqual([]);
  });
});

describe('workflowCheckNames', () => {
  test("a job's name, or its key when it has none", () => {
    const yaml = 'jobs:\n  check:\n    name: Lint\n  e2e:\n    runs-on: x\n';
    expect(workflowCheckNames(yaml)).toEqual(['Lint', 'e2e']);
  });

  test("GitHub's plan refusal is told apart from other errors", () => {
    // The body `gh api` printed for a private repository on GitHub Free.
    const refusal = JSON.stringify({
      message:
        'Upgrade to GitHub Pro or make this repository public to enable this feature.',
      documentation_url:
        'https://docs.github.com/rest/repos/rules#get-all-repository-rulesets',
      status: '403',
    });
    expect(needsPaidPlan(refusal)).toBe(true);
    expect(
      needsPaidPlan(
        JSON.stringify({ message: 'Resource not accessible', status: '403' })
      )
    ).toBe(false);
    expect(
      needsPaidPlan(JSON.stringify({ message: 'Not Found', status: '404' }))
    ).toBe(false);
    expect(needsPaidPlan('gh: not logged in')).toBe(false);
  });

  test('a required check no job reports is caught', () => {
    const yaml = 'jobs:\n  check:\n    name: Lint\n';
    const rules: Ruleset = {
      name: 'x',
      rules: [
        {
          type: 'required_status_checks',
          parameters: {
            required_status_checks: [{ context: 'Lint' }, { context: 'Old' }],
          },
        },
      ],
    };
    expect(unreportedChecks(rules, yaml)).toEqual(['Old']);
  });
});
