import { BasePage } from '../BasePage';

export class DemoQaHomePage extends BasePage {
  constructor() {
    super('demoqa');
  }

  open(): this {
    return this.visit('/');
  }

  expectLoaded(): void {
    cy.get('header img[src*="Toolsqa"]').should('be.visible');
  }

  expectCategoryCount(count: number): void {
    cy.get('.category-cards .card').should('have.length', count);
  }

  openCard(name: string): void {
    cy.contains('.card', name).scrollIntoView();
    cy.contains('.card', name).click();
  }
}
