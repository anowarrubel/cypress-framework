import { getCurrentEnv } from '../../config/env';

/** One pass/fail result from a security, SEO, performance (and similar) check. */
export interface Finding {
  id: string;
  title: string;
  passed: boolean;
  detail: string;
}

/** Check id -> why we tolerate a failure of it. */
export type KnownIssues = Record<string, string>;

export interface FindingScope {
  suite: string;
  site: string;
}

/**
 * Records the finding for the CI summary, then asserts on it.
 *   - fails and is listed as a known issue: logged, test passes
 *   - passes but is listed: logged as fixed, so the entry can be deleted
 *   - fails and is not listed: test fails
 */
export function expectFinding(scope: FindingScope, finding: Finding, known: KnownIssues = {}): void {
  const reason = known[finding.id];
  const status = finding.passed
    ? reason ? 'known-issue-fixed' : 'pass'
    : reason ? 'known-issue' : 'fail';

  cy.task('recordFinding', {
    ...scope,
    env: getCurrentEnv(),
    id: finding.id,
    title: finding.title,
    status,
    detail: finding.detail,
    reason,
  }, { log: false });

  cy.then(() => {
    if (status === 'known-issue') {
      Cypress.log({ name: 'known issue', message: `${finding.id}: ${finding.detail} (${reason})` });
    }
    if (status === 'known-issue-fixed') {
      Cypress.log({ name: 'now passing', message: `"${finding.id}" passes - remove it from the known issues. Was: ${reason}` });
    }
    expect(finding.passed || Boolean(reason), `${finding.title} - ${finding.detail}`).to.equal(true);
  });
}
