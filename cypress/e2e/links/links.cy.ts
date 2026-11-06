import { activeSites } from '../../../config/sites';
import { Finding, expectFindings } from '../../support/findings';
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

          const broken: { status: number; path: string }[] = [];
          cy.wrap(links, { log: false }).each((href: string) => {
            cy.request({ url: href, failOnStatusCode: false, timeout: 30_000, log: false }).then((res) => {
              if (res.status >= 400) broken.push({ status: res.status, path: new URL(href).pathname });
            });
          });

          cy.then(() => {
            const known = site.linkKnownIssues ?? {};
            const findings: Finding[] = broken.map(({ status, path }) => ({
              id: `broken-link:${path}`,
              title: 'Same-site link resolves',
              passed: false,
              detail: `HTTP ${status}`,
            }));
            const seen = new Set(findings.map((f) => f.id));
            for (const id of Object.keys(known).filter((k) => !seen.has(k) && k !== 'links-found')) {
              findings.push({ id, title: 'Same-site link resolves', passed: true, detail: 'now resolves' });
            }
            findings.push({
              id: 'links-found',
              title: 'Home page has same-site links to check',
              passed: links.length > 0,
              detail: `${links.length} found`,
            });
            expectFindings({ suite: 'links', site: site.id }, findings, known);
          });
        });
      });
    });
  });
}
