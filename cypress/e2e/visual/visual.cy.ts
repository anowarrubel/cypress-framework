import type { CompareResult } from '../../../lib/visual';
import { activeSites } from '../../../config/sites';
import { env, label, urlFor } from '../../support/run';

const DEFAULT_TOLERANCE = 0.002;
const update = Boolean(Cypress.env('UPDATE_SNAPSHOTS'));

// Baselines are per OS and browser, and CI has no Linux ones until someone
// generates them (workflow input "update_snapshots"). Skip there until then.
const skipInCi = Boolean(Cypress.env('CI')) && !Cypress.env('RUN_VISUAL') && !update;

if (!skipInCi) {
  for (const site of activeSites().filter((s) => s.visual?.length)) {
    describe(`Visual - ${label(site)}`, { browser: '!firefox' }, () => {
      for (const page of site.visual ?? []) {
        it(`${page.name} matches its baseline`, () => {
          const { width, height } = page.viewport ?? { width: 1280, height: 720 };
          const shot = `${site.id}-${page.name}`;
          const baseline = `cypress/snapshots/baseline/${site.id}/${page.name}-${Cypress.browser.name}-${Cypress.platform}.png`;

          cy.viewport(width, height);
          cy.visit(urlFor(site, page.path));
          if (page.waitFor) cy.get(page.waitFor).should('be.visible');
          // Web fonts only start loading once text is laid out; a screenshot taken
          // before that is a blank page.
          cy.document().then((doc) => doc.fonts.ready);
          cy.document().its('fonts.status').should('eq', 'loaded');
          // Keep the layout from depending on the OS scrollbar width.
          cy.document().then((doc) => {
            const style = doc.createElement('style');
            style.textContent = 'html { scrollbar-width: none; } ::-webkit-scrollbar { display: none; }';
            doc.head.appendChild(style);
          });

          let actualPath = '';
          cy.screenshot(shot, {
            capture: 'viewport',
            overwrite: true,
            blackout: page.mask ?? [],
            onAfterScreenshot: (_el, props) => {
              actualPath = props.path;
            },
          });

          cy.then(() =>
            cy.task<CompareResult>('compareSnapshot', {
              actualPath,
              baselinePath: baseline,
              diffPath: `reports/visual-diff/${shot}-${env}.png`,
              update,
              tolerance: page.tolerance ?? DEFAULT_TOLERANCE,
            }),
          ).then((result) => {
            const ok = result.status === 'match' || result.status === 'baseline-written';
            expect(ok, result.message).to.equal(true);
          });
        });
      }
    });
  }
}
