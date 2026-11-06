import { activeSites } from '../../../config/sites';
import { expectFinding } from '../../support/findings';
import { label, urlFor } from '../../support/run';

const MAX_LINKS = 30;

for (const site of activeSites()) {
  describe(`Links - ${label(site)}`, () => {
    it(`first ${MAX_LINKS} same-site links on the home page respond without an error`, () => {
      cy.visit(urlFor(site, '/'));

      cy.location('origin').then((origin) => {
        cy.document().then((doc) => {
          const links = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'))
            .map((a) => a.href.split('#')[0])
            .filter((href) => href.startsWith(origin))
            .filter((href, i, all) => all.indexOf(href) === i)
            .slice(0, MAX_LINKS);

          const broken: string[] = [];
          cy.wrap(links, { log: false }).each((href: string) => {
            cy.request({ url: href, failOnStatusCode: false, timeout: 30_000, log: false }).then((res) => {
              if (res.status >= 400) broken.push(`${res.status} ${href}`);
            });
          });

          cy.then(() => {
            expectFinding(
              { suite: 'links', site: site.id },
              {
                id: 'broken-links',
                title: 'Same-site links resolve',
                passed: broken.length === 0,
                detail: broken.length ? `${broken.length} of ${links.length} broken: ${broken.slice(0, 5).join(', ')}` : `${links.length} checked, none broken`,
              },
              site.linkKnownIssues,
            );
          });
        });
      });
    });
  });
}
