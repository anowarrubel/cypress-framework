import { activeSites } from '../../../config/sites';
import { SEO_CHECKS, SeoSnapshot, looksLikeRobotsFile, looksLikeSitemap, readDom } from '../../support/checks/seo';
import { expectFinding } from '../../support/findings';
import { label, urlFor } from '../../support/run';

for (const site of activeSites()) {
  describe(`SEO - ${label(site)}`, () => {
    let snapshot: SeoSnapshot;

    before(() => {
      cy.visit(urlFor(site, '/'));
      cy.document().then((doc) => {
        const dom = readDom(doc);
        cy.location('origin').then((origin) => {
          cy.request({ url: `${origin}/robots.txt`, failOnStatusCode: false }).then((robots) => {
            const body = robots.status === 200 ? String(robots.body) : '';
            const robotsTxtValid = looksLikeRobotsFile(body);
            // robots.txt may point at the sitemap; otherwise try the conventional spot.
            const declared = /^\s*sitemap:\s*(\S+)/im.exec(body)?.[1];

            cy.request({ url: declared ?? `${origin}/sitemap.xml`, failOnStatusCode: false }).then((sitemap) => {
              snapshot = {
                url: doc.location.href,
                ...dom,
                robotsTxtStatus: robots.status,
                robotsTxtValid,
                hasSitemap: sitemap.status === 200 && looksLikeSitemap(String(sitemap.body)),
              };
            });
          });
        });
      });
    });

    for (const check of SEO_CHECKS) {
      it(check.title, () => {
        expectFinding({ suite: 'seo', site: site.id }, { id: check.id, title: check.title, ...check.run(snapshot) }, site.seoKnownIssues);
      });
    }
  });
}
