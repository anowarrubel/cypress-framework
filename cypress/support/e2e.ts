import 'cypress-axe';
import 'cypress-mochawesome-reporter/register';

// The sites under test are third-party demo apps that throw their own
// JavaScript errors. Those aren't failures of the checks we run here.
Cypress.on('uncaught:exception', () => false);
