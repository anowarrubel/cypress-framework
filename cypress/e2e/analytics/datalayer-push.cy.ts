import { expectDataLayerEntry, expectDataLayerEvent } from '../../support/analytics';

// Shows how to prove that a click causes a data layer push. Runs against a
// local fixture, so it needs no network and no real tracking setup.
describe('Data layer pushes on interaction', () => {
  beforeEach(() => {
    cy.visit('cypress/fixtures/datalayer.html');
  });

  it('Google: clicking Add to cart pushes an add_to_cart event', () => {
    cy.contains('button', 'Add to cart').click();
    expectDataLayerEvent('add_to_cart');
  });

  it('Google: the push carries the ecommerce payload', () => {
    cy.contains('button', 'Add to cart').click();
    expectDataLayerEntry({ event: 'add_to_cart', ecommerce: { currency: 'USD', value: 19.99 } });
  });

  it('Adobe: clicking the promo pushes to adobeDataLayer, nested objects included', () => {
    cy.contains('button', 'Open promo').click();
    expectDataLayerEntry({ event: 'promo:click', eventInfo: { path: 'page.promo' } }, 'adobeDataLayer');
  });

  it('nothing is pushed before the user acts', () => {
    cy.window().then((win) => {
      expect((win as unknown as { dataLayer: unknown[] }).dataLayer).to.have.length(0);
    });
  });
});
