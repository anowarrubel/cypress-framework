import { BasePage } from '../BasePage';

export class SauceInventoryPage extends BasePage {
  constructor() {
    super('saucedemo');
  }

  expectLoaded(): void {
    cy.get('.title').should('have.text', 'Products');
  }

  addFirstItemToCart(): void {
    cy.get('.inventory_item').first().contains('button', /add to cart/i).click();
  }

  expectCartCount(count: number): void {
    cy.get('.shopping_cart_badge').should('have.text', String(count));
  }

  openCart(): void {
    cy.get('.shopping_cart_link').click();
  }
}
