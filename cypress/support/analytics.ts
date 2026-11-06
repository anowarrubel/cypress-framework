import { ANALYTICS_VENDORS, AnalyticsVendorId } from '../../config/analytics-vendors';

export type DataLayerEntry = Record<string, unknown>;

/**
 * Starts recording every request the page makes. Call it BEFORE cy.visit():
 * anything fired earlier is invisible. The returned array fills in as the
 * page loads.
 */
export function trackRequests(): string[] {
  const urls: string[] = [];
  cy.intercept({ url: /.*/ }, (req) => {
    urls.push(req.url);
  });
  return urls;
}

export function expectVendorRequest(urls: string[], id: AnalyticsVendorId, timeout = 15_000): void {
  const vendor = ANALYTICS_VENDORS[id];
  // should() re-runs the callback until it passes, so late requests are fine.
  cy.wrap(urls, { timeout }).should((seen) => {
    expect(
      seen.some((url) => vendor.request.test(url)),
      `a ${vendor.label} request matching ${vendor.request}`,
    ).to.equal(true);
  });
}

/** Waits a moment for late scripts, then asserts no known tracking vendor made a request. */
export function expectNoTracking(urls: string[], settleMs = 3_000): void {
  cy.wait(settleMs);
  cy.then(() => {
    const seen = Object.values(ANALYTICS_VENDORS)
      .filter((vendor) => urls.some((url) => vendor.request.test(url)))
      .map((vendor) => vendor.label);
    expect(seen, 'unexpected analytics or tracking requests').to.deep.equal([]);
  });
}

function readLayer(win: Window, name: string): DataLayerEntry[] {
  const layer = (win as unknown as Record<string, unknown>)[name];
  return Array.isArray(layer) ? layer.map((entry) => ({ ...(entry as object) })) : [];
}

export function expectDataLayerNotEmpty(name = 'dataLayer', timeout = 15_000): void {
  cy.window({ timeout }).should((win) => {
    expect(readLayer(win, name).length, `entries in window.${name}`).to.be.greaterThan(0);
  });
}

/**
 * The data layer has an entry containing every key/value in `match`; extra
 * keys on the entry are fine, so only the parts that matter are asserted.
 *   expectDataLayerEntry({ event: 'purchase', value: 49.9 })
 */
export function expectDataLayerEntry(match: DataLayerEntry, name = 'dataLayer', timeout = 15_000): void {
  const matches = (entry: DataLayerEntry) =>
    Object.entries(match).every(([key, value]) => JSON.stringify(entry[key]) === JSON.stringify(value));
  cy.window({ timeout }).should((win) => {
    expect(readLayer(win, name).some(matches), `window.${name} has an entry matching ${JSON.stringify(match)}`).to.equal(true);
  });
}

export const expectDataLayerEvent = (event: string, name = 'dataLayer', timeout = 15_000) =>
  expectDataLayerEntry({ event }, name, timeout);
