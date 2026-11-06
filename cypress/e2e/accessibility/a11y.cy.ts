import type { Result } from 'axe-core';
import { activeSites } from '../../../config/sites';
import { expectFinding } from '../../support/findings';
import { env, label, urlFor } from '../../support/run';

type AxeWindow = Window & { axe: { run(context: Document, options: object): Promise<{ violations: Result[] }> } };

// Cumulative: AA includes A.
const WCAG_AA = ['wcag2a', 'wcag21a', 'wcag2aa', 'wcag21aa'];
const BLOCKING_IMPACT = ['serious', 'critical'];

for (const site of activeSites()) {
  describe(`Accessibility - ${label(site)}`, () => {
    const known = site.a11yKnownIssues ?? {};

    it('home page has no serious or critical WCAG 2.1 AA violations', () => {
      cy.visit(urlFor(site, '/'));
      cy.injectAxe();

      cy.window().then((win) =>
        (win as AxeWindow).axe.run(win.document, { runOnly: { type: 'tag', values: WCAG_AA } }),
      ).then(({ violations }) => {
        cy.writeFile(`reports/axe/${site.id}-${env}.json`, violations, { log: false });

        const summary = violations
          .map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
          .join('\n');
        if (summary) cy.task('log', summary, { log: false });

        const scope = { suite: 'accessibility', site: site.id };
        const blocking = violations.filter((v) => v.impact && BLOCKING_IMPACT.includes(v.impact));

        for (const v of blocking) {
          expectFinding(scope, { id: v.id, title: v.help, passed: false, detail: `${v.impact}, ${v.nodes.length} node(s): ${v.helpUrl}` }, known);
        }
        // Known issues that no longer show up: say so, so the entry can go.
        const seen = new Set(blocking.map((v) => v.id));
        for (const id of Object.keys(known).filter((k) => !seen.has(k))) {
          expectFinding(scope, { id, title: id, passed: true, detail: 'not reported' }, known);
        }
        expectFinding(scope, { id: 'axe-scan', title: 'axe scan completed', passed: true, detail: `${violations.length} violation(s) in total` });
      });
    });
  });
}
