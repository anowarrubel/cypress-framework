import { SiteConfig, SiteId, getSite } from '../../../config/sites';
import { urlFor } from '../run';

export abstract class BasePage {
  protected readonly site: SiteConfig;

  constructor(siteId: SiteId) {
    this.site = getSite(siteId);
  }

  visit(path = '/', options: { failOnStatusCode?: boolean } = {}): this {
    cy.visit(urlFor(this.site, path), options);
    return this;
  }

  expectUrlMatches(pattern: RegExp): void {
    cy.url().should('match', pattern);
  }
}
