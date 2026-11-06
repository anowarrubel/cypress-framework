import { activeSites } from '../../../config/sites';
import { SauceLoginPage } from '../../support/pages/saucedemo/LoginPage';
import { SauceInventoryPage } from '../../support/pages/saucedemo/InventoryPage';

if (activeSites().some((s) => s.id === 'saucedemo')) {
  describe('SauceDemo - login and cart', () => {
    const login = new SauceLoginPage();
    const inventory = new SauceInventoryPage();

    // The login form itself is under test here, so these go through the UI.
    describe('login form', () => {
      it('valid user can log in and lands on inventory', () => {
        cy.fixture('users').then(({ standard }) => {
          login.open().login(standard.username, standard.password);
        });
        inventory.expectLoaded();
      });

      it('locked-out user sees an error', () => {
        cy.fixture('users').then(({ locked }) => {
          login.open().login(locked.username, locked.password);
        });
        login.expectLoginError(/locked out/i);
      });
    });

    // Everything past the login reuses a cached session.
    describe('cart', () => {
      beforeEach(() => {
        cy.loginAs('standard');
        // A single-page app on GitHub Pages: deep links answer 404 but still boot the app.
        inventory.visit('/inventory.html', { failOnStatusCode: false });
      });

      it('user can add an item to the cart', () => {
        inventory.expectLoaded();
        inventory.addFirstItemToCart();
        inventory.expectCartCount(1);
      });

      it('user can open the cart after adding an item', () => {
        inventory.addFirstItemToCart();
        inventory.openCart();
        inventory.expectUrlMatches(/cart\.html/);
      });
    });
  });
}
