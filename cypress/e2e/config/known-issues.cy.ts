import { sites } from '../../../config/sites';
import { I18N_CHECKS } from '../../support/checks/i18n';
import { LIGHTHOUSE_CHECKS } from '../../support/checks/lighthouse';
import { LAYOUT_CHECKS, VIEWPORTS } from '../../support/checks/responsive';
import { SECURITY_CHECKS } from '../../support/checks/security';
import { SEO_CHECKS } from '../../support/checks/seo';

const ids = (checks: { id: string }[]) => checks.map((c) => c.id);
const responsiveIds = VIEWPORTS.flatMap((v) => LAYOUT_CHECKS.map((c) => `${v.name}:${c.id}`));

// A misspelt key would silently do nothing, so check each list against the
// checks it is meant to match.
describe('Known issue lists in config/sites.ts', () => {
  for (const site of Object.values(sites)) {
    const lists: [string, Record<string, string> | undefined, (id: string) => boolean][] = [
      ['securityKnownIssues', site.securityKnownIssues, (id) => ids(SECURITY_CHECKS).includes(id)],
      ['seoKnownIssues', site.seoKnownIssues, (id) => ids(SEO_CHECKS).includes(id)],
      ['i18nKnownIssues', site.i18nKnownIssues, (id) => ids(I18N_CHECKS).includes(id)],
      ['lighthouseKnownIssues', site.lighthouseKnownIssues, (id) => ids(LIGHTHOUSE_CHECKS).includes(id)],
      ['responsiveKnownIssues', site.responsiveKnownIssues, (id) => responsiveIds.includes(id)],
      ['linkKnownIssues', site.linkKnownIssues, (id) => id === 'links-found' || id.startsWith('broken-link:')],
    ];

    for (const [name, list, isValid] of lists) {
      it(`${site.id}.${name} only names real checks and gives a reason`, () => {
        for (const [id, reason] of Object.entries(list ?? {})) {
          expect(isValid(id), `"${id}" is not a known check id`).to.equal(true);
          expect(reason.trim(), `reason for "${id}"`).not.to.equal('');
        }
      });
    }
  }
});
