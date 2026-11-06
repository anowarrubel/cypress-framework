import { BasePage } from '../BasePage';

export class AcademyBugsHomePage extends BasePage {
  constructor() {
    super('academybugs');
  }

  open(): this {
    this.visit('/');
    // First-time visitors get a guided tour whose full-page overlay swallows
    // every click; hide it so the tests exercise the real page.
    cy.document().then((doc) => {
      const style = doc.createElement('style');
      style.textContent = '#TourTipDisabledArea, .TourTip, .TourTipCover { display: none !important; }';
      doc.head.appendChild(style);
    });
    return this;
  }

  expectLoaded(): void {
    cy.contains('h1, h2, h3', 'Examples of Bugs').should('be.visible');
    cy.contains('a', /^Find Bugs$/).should('be.visible');
  }

  openFindBugs(): void {
    cy.contains('a', /^Find Bugs$/).first().click();
  }
}
