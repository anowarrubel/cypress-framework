import { defineConfig } from 'cypress';
import dotenv from 'dotenv';
import { gatherSecurityContext } from './lib/security';
import { runLighthouse } from './lib/lighthouse';
import { compareSnapshot, CompareRequest } from './lib/visual';
import { recordFinding, FindingRecord } from './lib/findings-log';

dotenv.config({ quiet: true });

// Variables the specs read through Cypress.env(): the run selectors, Sauce
// Demo logins, and any <SITE>_<ENV>_URL host override.
const PASS_THROUGH = /^(CI|TEST_ENV|SITE|UPDATE_SNAPSHOTS|RUN_VISUAL|SAUCE_USERNAME|SAUCE_PASSWORD|[A-Z0-9_]+_(DEV|QA|PROD)_URL)$/;

export default defineConfig({
  e2e: {
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10_000,
    pageLoadTimeout: 60_000,
    retries: { runMode: 1, openMode: 0 },
    viewportWidth: 1280,
    viewportHeight: 800,
    reporter: 'cypress-mochawesome-reporter',
    reporterOptions: {
      reportDir: 'reports',
      reportFilename: 'index',
      charts: true,
      embeddedScreenshots: true,
      inlineAssets: true,
      saveJson: true,
    },
    setupNodeEvents(on, config) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('cypress-mochawesome-reporter/plugin')(on);

      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined && PASS_THROUGH.test(key)) config.env[key] = value;
      }

      on('task', {
        securityContext: (baseUrl: string) => gatherSecurityContext(baseUrl),
        lighthouse: ({ url, formFactor, reportPath }: { url: string; formFactor: 'mobile' | 'desktop'; reportPath: string }) =>
          runLighthouse(url, formFactor, reportPath),
        compareSnapshot: (req: CompareRequest) => compareSnapshot(req),
        recordFinding: (record: FindingRecord) => recordFinding(record),
        log: (message: string) => {
          console.log(message);
          return null;
        },
      });

      return config;
    },
  },
});
