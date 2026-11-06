import type { LighthouseSummary } from '../../../lib/lighthouse';
import { DEFAULT_LIGHTHOUSE_BUDGET, activeSites } from '../../../config/sites';
import { LIGHTHOUSE_CHECKS } from '../../support/checks/lighthouse';
import { expectFinding } from '../../support/findings';
import { env, label, urlFor } from '../../support/run';

// Lighthouse launches its own Chrome, so this runs once per site whichever
// browser Cypress itself is using.
for (const site of activeSites()) {
  describe(`Lighthouse - ${label(site)}`, { browser: '!firefox' }, () => {
    const budget = { ...DEFAULT_LIGHTHOUSE_BUDGET, ...site.lighthouseBudget };
    let result: LighthouseSummary;

    before(() => {
      cy.task<LighthouseSummary>(
        'lighthouse',
        { url: urlFor(site, '/'), formFactor: 'mobile', reportPath: `reports/lighthouse/${site.id}-${env}.html` },
        { timeout: 240_000 },
      ).then((r) => {
        result = r;
      });
    });

    for (const check of LIGHTHOUSE_CHECKS) {
      it(check.title, () => {
        expectFinding(
          { suite: 'performance', site: site.id },
          { id: check.id, title: check.title, ...check.run(result, budget) },
          site.lighthouseKnownIssues,
        );
      });
    }
  });
}
