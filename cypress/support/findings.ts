import { getCurrentEnv } from '../../config/env';

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

function classify(finding: Finding, reason: string | undefined) {
  if (finding.passed) return reason ? 'known-issue-fixed' : 'pass';
  return reason ? 'known-issue' : 'fail';
}

/**
 * Records every finding for the CI summary first, then asserts, so one failure
 * doesn't hide the rest. A failure listed in `known` passes with a log line; a
 * listed check that now passes is logged so the entry can be removed.
 */
export function expectFindings(scope: FindingScope, findings: Finding[], known: KnownIssues = {}): void {
  const failures: string[] = [];

  for (const finding of findings) {
    const reason = known[finding.id];
    const status = classify(finding, reason);

    cy.task('recordFinding', {
      ...scope,
      env: getCurrentEnv(),
      browser: Cypress.browser.name,
      id: finding.id,
      title: finding.title,
      status,
      detail: finding.detail,
      reason,
    }, { log: false });

    if (status === 'known-issue') {
      Cypress.log({ name: 'known issue', message: `${finding.id}: ${finding.detail} (${reason})` });
    } else if (status === 'known-issue-fixed') {
      Cypress.log({ name: 'now passing', message: `"${finding.id}" passes, remove it from the known issues. Was: ${reason}` });
    } else if (status === 'fail') {
      failures.push(`${finding.title} - ${finding.detail}`);
    }
  }

  cy.then(() => {
    expect(failures, `${failures.length} failing check(s)`).to.deep.equal([]);
  });
}

export const expectFinding = (scope: FindingScope, finding: Finding, known: KnownIssues = {}) =>
  expectFindings(scope, [finding], known);
