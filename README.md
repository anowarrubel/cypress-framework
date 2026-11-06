# Cypress Multi-Site Test Framework

[![Cypress Tests](https://github.com/anowarrubel/cypress-framework/actions/workflows/cypress.yml/badge.svg)](https://github.com/anowarrubel/cypress-framework/actions/workflows/cypress.yml)

Cypress + TypeScript suite that runs the same checks against several sites and
environments. Functional, accessibility (axe), security, SEO, analytics,
performance (Lighthouse), responsive, API, visual, i18n and broken-link checks
run against three public demo sites (DemoQA, Academy Bugs, Sauce Demo), and
GitHub Actions can run any combination on demand.

Cypress counterpart of [playwright-framework](https://github.com/anowarrubel/playwright-framework): same sites, same check ids, same known-issue pattern.

## Setup

Needs Node 18.17+ and npm. Chrome is used by default; Firefox and Edge work
if installed.

```bash
npm install
cp .env.example .env
npm run typecheck && npm run lint
```

## Running tests

`npm run t` is the launcher. Name the pieces in any order, separated by spaces
or colons; whatever you leave out falls back to a default (env from `.env`,
else `qa`; browser chrome; site and suite all).

```bash
npm run t -- demoqa prod seo              # chrome, headless
npm run t -- demoqa:prod:seo:firefox
npm run t -- saucedemo a11y --headed
npm run t -- --suite=security,seo --env=prod --browser=electron
npm run t -- saucedemo functional --open  # Cypress app, for writing tests
npm run t                                 # menu (terminal only, never in CI)
```

Suites: `functional`, `accessibility` (`a11y`), `security`, `seo`, `analytics`,
`performance` (`perf`, `lighthouse`), `responsive` (`mobile`), `api`, `visual`,
`i18n`, `links`. Flags: `--suite --site --env --browser`, `--headed --open`,
`--update` (visual baselines), `--yes` (skip the menu). Anything after a second
`--` goes straight to `cypress run`.

`TEST_ENV` and `SITE` (one id or a comma-separated list) can also live in `.env`. To point a site at real hosts,
set `<SITE>_<ENV>_URL` (for example `DEMOQA_QA_URL`); it overrides
`config/sites.ts` for every suite, API included.

## What each suite checks

| Suite | Checks |
|---|---|
| Functional | login, cart and navigation flows through page objects |
| Accessibility | axe-core WCAG 2.1 AA on the home page; serious and critical violations fail |
| Security | https redirect, HSTS, nosniff, clickjacking, CSP, Referrer-Policy, version leaks, cookie flags, TLS expiry |
| SEO | title, description, canonical, lang, viewport, one h1, noindex, robots.txt, sitemap |
| Analytics | expected vendors fire, data layer exists and gets its events, no-tracking sites load none |
| Performance | Lighthouse (mobile profile): performance, accessibility, best-practices and SEO scores, plus LCP, CLS and TBT budgets |
| Responsive | at 375px and 768px: viewport meta, no sideways scroll, media fits, readable text |
| API | status, JSON, response time and shape for each listed endpoint |
| Visual | screenshot of each listed page against a baseline (0.2% pixel tolerance) |
| i18n | valid lang, UTF-8, hreflang, no garbled text, loads under de/ja/ar locales; locale formatting demo |
| Config | every known-issue key names a real check and has a reason |
| Links | the first 30 same-site links on the home page answer without a 4xx or 5xx |

Everything is driven from `config/sites.ts`. Each site can define `analytics`,
`api`, `visual`, `lighthouseBudget` and the known-issue lists below.

Security, performance and API checks don't depend on the browser Cypress uses, so they skip on Firefox.

### Known issues

Each check family has a per-site list (`a11yKnownIssues`,
`securityKnownIssues`, `seoKnownIssues`, `responsiveKnownIssues`,
`i18nKnownIssues`, `lighthouseKnownIssues`, `linkKnownIssues`) mapping a check
id to a one-line reason. A listed check that fails does not fail the build; it
shows up under "Known issues" in the run summary. If it starts passing, the
summary lists it as "now passing" and the entry can be deleted. A failing check
that isn't listed fails the build.

### Analytics and data layers

`cypress/e2e/analytics/datalayer-push.cy.ts` shows how to verify that a click
causes a push, for Google (`window.dataLayer`) and Adobe
(`window.adobeDataLayer`), against a local fixture page:

```ts
cy.contains('button', 'Add to cart').click();
expectDataLayerEvent('add_to_cart');
// or match an entry exactly, nested objects included:
expectDataLayerEntry({ event: 'promo:click', eventInfo: { path: 'page.promo' } }, 'adobeDataLayer');
```

For an Adobe site use `analytics: { vendors: ['adobe'], dataLayerName: 'adobeDataLayer' }`.
Vendor detection lives in `config/analytics-vendors.ts`.

### Visual baselines

Baselines are named per browser and OS (`login-chrome-darwin.png`). Create or
refresh them, look at the images, then commit:

```bash
npm run t -- saucedemo visual --update
```

CI needs its own Linux baselines: run the workflow with suite `visual` and
`update_snapshots` ticked, download the `visual-baselines` artifact and commit
it. Until then CI skips the visual suite on automatic runs.

### Reports

`reports/index.html` is the Mochawesome report, `reports/lighthouse/` has one
full Lighthouse report per site, `reports/axe/` the raw axe results, and
`reports/findings.jsonl` every check recorded in the run. `npm run summary`
turns the last file into a table (CI adds it to the job summary).
Screenshots of failures are in `cypress/screenshots/`.

## Project layout

```
config/       env.ts, sites.ts, analytics-vendors.ts
lib/          Node-side helpers behind cy.task: security, Lighthouse, image diff
cypress/
  e2e/        one folder per suite
  fixtures/   users.json (test logins), datalayer.html (data layer demo page)
  support/    page objects, custom commands (cy.loginAs), check definitions, findings,
              analytics helpers
scripts/      run.mjs (the `npm run t` launcher), summary.mjs
```

## Adding a site

1. Add the id to `SiteId` and an entry to `sites` in `config/sites.ts` with its
   `dev` / `qa` / `prod` URLs.
2. Add page objects under `cypress/support/pages/<site>/` and a spec in
   `cypress/e2e/functional/`, wrapped in
   `if (activeSites().some((s) => s.id === '<site>'))`.
3. Run it: `npm run t -- <site>`.

Accessibility, security, SEO, performance, responsive, i18n and links pick the
site up automatically. Add `analytics`, `api` or `visual` blocks to include it
in those suites. Expect some checks to fail on a first run; record each one as
a known issue with a reason, or fix the site.

## Adding an environment

Add the value to `TestEnv` and `VALID_ENVS` in `config/env.ts`, a matching key
to every site's `baseUrls`, and the workflow's `environment` options. The
launcher reads the list from `TestEnv`.

## GitHub Actions

`.github/workflows/cypress.yml` runs on pull requests and pushes to main
(against `qa`), nightly at 02:00 UTC, and on demand with environment, site and
suite dropdowns. Each run type-checks and lints, then runs the suites on Chrome
and Firefox, writes the findings table to the job summary and uploads
`cypress-report-<browser>-<env>` (HTML report, Lighthouse reports, failure
screenshots). Dependabot keeps npm packages and actions current.

Optional secrets: `SAUCE_USERNAME` and `SAUCE_PASSWORD` (the public demo values
are the default).
