import { activeSites } from '../../../config/sites';
import { SauceLoginPage } from '../../support/pages/saucedemo/LoginPage';
import { SauceInventoryPage } from '../../support/pages/saucedemo/InventoryPage';

if (activeSites().some((s) => s.id === 'saucedemo')) {
  describe('SauceDemo - login and cart', () => {
    const login = new SauceLoginPage();
    const inventory = new SauceInventoryPage();

    it('valid user can log in and lands on inventory', () => {
      login.open().login();
      inventory.expectLoaded();
    });

    it('locked-out user sees an error', () => {
      login.open().login('locked_out_user', 'secret_sauce');
      login.expectLoginError(/locked out/i);
    });

    it('user can add an item to the cart', () => {
      login.open().login();
      inventory.expectLoaded();
      inventory.addFirstItemToCart();
      inventory.expectCartCount(1);
    });

    it('user can open the cart after adding an item', () => {
      login.open().login();
      inventory.addFirstItemToCart();
      inventory.openCart();
      inventory.expectUrlMatches(/cart\.html/);
    });
  });
}
