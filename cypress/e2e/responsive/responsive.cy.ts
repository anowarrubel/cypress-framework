import { activeSites } from '../../../config/sites';
import { LAYOUT_CHECKS, LayoutSnapshot, VIEWPORTS, readLayout } from '../../support/checks/responsive';
import { expectFinding } from '../../support/findings';
import { label, urlFor } from '../../support/run';

for (const site of activeSites()) {
  for (const viewport of VIEWPORTS) {
    describe(`Responsive - ${label(site)} at ${viewport.name} (${viewport.width}px)`, () => {
      let layout: LayoutSnapshot;

      before(() => {
        cy.viewport(viewport.width, viewport.height);
        cy.visit(urlFor(site, '/'));
        cy.window().then((win) => {
          layout = readLayout(win);
        });
      });

      for (const check of LAYOUT_CHECKS) {
        it(check.title, () => {
          expectFinding(
            { suite: 'responsive', site: site.id },
            { id: `${viewport.name}:${check.id}`, title: check.title, ...check.run(layout) },
            site.responsiveKnownIssues,
          );
        });
      }
    });
  }
}
