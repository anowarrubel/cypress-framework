import { ANALYTICS_VENDORS } from '../../../config/analytics-vendors';
import { activeSites } from '../../../config/sites';
import {
  expectDataLayerEvent,
  expectDataLayerNotEmpty,
  expectNoTracking,
  expectVendorRequest,
  trackRequests,
} from '../../support/analytics';
import { label, urlFor } from '../../support/run';

for (const site of activeSites().filter((s) => s.analytics)) {
  const analytics = site.analytics!;
  const layer = analytics.dataLayerName ?? 'dataLayer';

  describe(`Analytics - ${label(site)}`, () => {
    if (analytics.vendors.length === 0) {
      it('loads no analytics or tracking requests', () => {
        const urls = trackRequests();
        cy.visit(urlFor(site, '/'));
        expectNoTracking(urls);
      });
      return;
    }

    for (const id of analytics.vendors) {
      it(`${ANALYTICS_VENDORS[id].label} request fires on page load`, () => {
        const urls = trackRequests();
        cy.visit(urlFor(site, '/'));
        expectVendorRequest(urls, id);
      });
    }

    if (analytics.dataLayerEvents?.length) {
      it(`window.${layer} exists and receives its events`, () => {
        cy.visit(urlFor(site, '/'));
        expectDataLayerNotEmpty(layer);
        for (const event of analytics.dataLayerEvents ?? []) expectDataLayerEvent(event, layer);
      });
    }
  });
}
