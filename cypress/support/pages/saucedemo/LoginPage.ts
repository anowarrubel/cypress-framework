import { BasePage } from '../BasePage';

export class SauceLoginPage extends BasePage {
  constructor() {
    super('saucedemo');
  }

  open(): this {
    return this.visit('/');
  }

  login(user?: string, pass?: string): void {
    cy.get('#user-name').type(user ?? this.site.credentials?.username ?? '');
    cy.get('#password').type(pass ?? this.site.credentials?.password ?? '', { log: false });
    cy.get('#login-button').click();
  }

  expectLoginError(message: string | RegExp): void {
    cy.get('[data-test="error"]').contains(message);
  }
}
