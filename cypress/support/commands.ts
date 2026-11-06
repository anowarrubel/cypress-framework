import { SauceLoginPage } from './pages/saucedemo/LoginPage';

type SauceUser = 'standard' | 'locked';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Logs into Sauce Demo with a user from cypress/fixtures/users.json; the session is cached across tests. */
      loginAs(user: SauceUser): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginAs', (user: SauceUser) => {
  cy.fixture('users').then((users: Record<SauceUser, { username: string; password: string }>) => {
    // SAUCE_USERNAME / SAUCE_PASSWORD (CI secrets) win for the standard user.
    const creds = user === 'standard'
      ? {
          username: Cypress.env('SAUCE_USERNAME') ?? users.standard.username,
          password: Cypress.env('SAUCE_PASSWORD') ?? users.standard.password,
        }
      : users[user];

    cy.session(
      user,
      () => {
        const login = new SauceLoginPage();
        login.open().login(creds.username, creds.password);
        cy.url().should('include', 'inventory.html');
      },
      {
        validate: () => {
          cy.getCookie('session-username').should('exist');
        },
      },
    );
  });
});
