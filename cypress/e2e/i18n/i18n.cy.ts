import { activeSites } from '../../../config/sites';
import { I18N_CHECKS, I18nSnapshot, PROBE_LOCALES, readI18n } from '../../support/checks/i18n';
import { expectFinding } from '../../support/findings';
import { label, urlFor } from '../../support/run';

for (const site of activeSites()) {
  describe(`i18n - ${label(site)}`, () => {
    describe('markup', () => {
      let snapshot: I18nSnapshot;

      before(() => {
        cy.request({ url: urlFor(site, '/'), failOnStatusCode: false }).then((res) => {
          const contentType = String(res.headers['content-type'] ?? '');
          cy.visit(urlFor(site, '/'));
          cy.document().then((doc) => {
            snapshot = { ...readI18n(doc), contentType };
          });
        });
      });

      for (const check of I18N_CHECKS) {
        it(check.title, () => {
          expectFinding({ suite: 'i18n', site: site.id }, { id: check.id, title: check.title, ...check.run(snapshot) }, site.i18nKnownIssues);
        });
      }
    });

    describe('loads under other locales', () => {
      for (const { code, note } of PROBE_LOCALES) {
        it(`renders under ${code} (${note})`, () => {
          cy.visit(urlFor(site, '/'), {
            headers: { 'Accept-Language': code },
            onBeforeLoad(win) {
              Object.defineProperty(win.navigator, 'language', { value: code, configurable: true });
              Object.defineProperty(win.navigator, 'languages', { value: [code], configurable: true });
            },
          });
          cy.get('body').should('be.visible');
          cy.document().then((doc) => {
            expect(readI18n(doc).brokenCharacters, 'replacement characters in the page text').to.equal(0);
          });
        });
      }
    });
  });
}
