import type { SecurityContext } from '../../../lib/security';
import { activeSites } from '../../../config/sites';
import { SECURITY_CHECKS } from '../../support/checks/security';
import { expectFinding } from '../../support/findings';
import { label, urlFor } from '../../support/run';

// Headers and TLS come from Node, not the browser, so one browser is enough.
for (const site of activeSites()) {
  describe(`Security - ${label(site)}`, { browser: '!firefox' }, () => {
    let ctx: SecurityContext;

    before(() => {
      cy.task<SecurityContext>('securityContext', urlFor(site), { timeout: 90_000 }).then((c) => {
        ctx = c;
      });
    });

    for (const check of SECURITY_CHECKS) {
      it(check.title, () => {
        expectFinding(
          { suite: 'security', site: site.id },
          { id: check.id, title: check.title, ...check.run(ctx) },
          site.securityKnownIssues,
        );
      });
    }
  });
}
