/**
 * One entry per site under test. Each declares a base URL per environment, so
 * the same specs run against dev, qa or prod by changing TEST_ENV.
 *
 * The three sample sites are public demo apps with one host each, so all
 * three environments point at the same URL. For a real project set
 * <SITE>_<ENV>_URL (e.g. SAUCEDEMO_QA_URL) in .env or CI; see getBaseUrl().
 */
import { TestEnv, readVar } from './env';
import { AnalyticsVendorId } from './analytics-vendors';

export type SiteId = 'demoqa' | 'academybugs' | 'saucedemo';

export interface AnalyticsConfig {
  /** Vendors expected to call on page load. An empty list asserts the site loads no tracking at all. */
  vendors: AnalyticsVendorId[];
  /** Data layer name when it isn't `dataLayer` (Adobe uses 'adobeDataLayer'). */
  dataLayerName?: string;
  /** Data layer `event` names that must appear after page load. */
  dataLayerEvents?: string[];
}

/** One API call to verify: what to send and what a good answer looks like. */
export interface ApiEndpoint {
  title: string;
  /** Appended to the site's API base URL. */
  path: string;
  method?: 'GET' | 'POST';
  /** Expected HTTP status. Negative cases (400, 401, 404) belong here too. */
  status: number;
  /** Expected list shape. `arrayAt` names the property holding it ('' when the body is the list). */
  list?: { arrayAt: string; itemKeys: string[]; minItems?: number };
  /** Keys that must exist at the top level of an object body. */
  keys?: string[];
}

export interface ApiConfig {
  /** Appended to the site's base URL, so a <SITE>_<ENV>_URL override applies. */
  basePath?: string;
  /** Every endpoint must answer faster than this. Default 3000 ms. */
  maxResponseMs?: number;
  endpoints: ApiEndpoint[];
}

export interface VisualPage {
  /** Part of the baseline file name, so keep it short and stable. */
  name: string;
  path: string;
  /** Selectors to blank out before comparing (dates, ads, anything that moves). */
  mask?: string[];
  viewport?: { width: number; height: number };
}

/** Lighthouse thresholds. Category scores are 0-1; the metrics are in ms (CLS is unitless). */
export interface LighthouseBudget {
  performance: number;
  accessibility: number;
  'best-practices': number;
  seo: number;
  lcp: number;
  cls: number;
  tbt: number;
}

export interface SiteConfig {
  id: SiteId;
  displayName: string;
  baseUrls: Record<TestEnv, string>;
  credentials?: { username?: string; password?: string };

  /**
   * Known issues are findings we have seen and are not gating on, as
   * id -> why. They still show in the run output and the CI summary; they just
   * don't fail the build. Delete an entry once the site fixes it.
   */
  a11yKnownIssues?: Record<string, string>;
  securityKnownIssues?: Record<string, string>;
  seoKnownIssues?: Record<string, string>;
  /** Keyed '<viewport>:<check id>', e.g. 'mobile:no-horizontal-scroll'. */
  responsiveKnownIssues?: Record<string, string>;
  i18nKnownIssues?: Record<string, string>;
  lighthouseKnownIssues?: Record<string, string>;
  linkKnownIssues?: Record<string, string>;

  /** Omit any of these to skip that suite for the site. */
  analytics?: AnalyticsConfig;
  api?: ApiConfig;
  visual?: VisualPage[];
  /** Overrides on top of DEFAULT_LIGHTHOUSE_BUDGET. */
  lighthouseBudget?: Partial<LighthouseBudget>;
}

export const DEFAULT_LIGHTHOUSE_BUDGET: LighthouseBudget = {
  performance: 0.6,
  accessibility: 0.85,
  'best-practices': 0.8,
  seo: 0.8,
  lcp: 4000,
  cls: 0.1,
  tbt: 600,
};

export const sites: Record<SiteId, SiteConfig> = {
  demoqa: {
    id: 'demoqa',
    displayName: 'DemoQA',
    baseUrls: {
      dev: 'https://demoqa.com',
      qa: 'https://demoqa.com',
      prod: 'https://demoqa.com',
    },
    a11yKnownIssues: {
      'image-alt': 'One home page image has no alt text',
      'link-name': 'One home page link has no text or aria-label',
    },
    securityKnownIssues: {
      'strict-transport-security': 'No Strict-Transport-Security header on the HTTPS response',
      'x-content-type-options': 'X-Content-Type-Options header missing',
      'clickjacking-protection': 'No X-Frame-Options or frame-ancestors rule, so the page can be framed',
      'content-security-policy': 'No Content-Security-Policy header',
      'referrer-policy': 'No Referrer-Policy header; browsers fall back to their default',
      'info-disclosure': 'Exposes the nginx version and X-Powered-By: Express',
    },
    seoKnownIssues: {
      title: 'Page title is just "demosite" (8 characters)',
      'meta-description': 'No <meta name="description"> on the home page',
      canonical: 'No <link rel="canonical"> in the head',
      'single-h1': 'Home page has no <h1>',
      'robots-txt': '/robots.txt returns the HTML app shell, not a robots file',
      sitemap: '/sitemap.xml returns the HTML app shell, not a sitemap',
    },
    responsiveKnownIssues: {
      'mobile:no-horizontal-scroll': 'Home page is wider than a 375px phone screen',
    },
    lighthouseKnownIssues: {
      'performance-score': 'Scores about 58 on the throttled mobile profile, just under the 60 budget',
      'accessibility-score': 'Scores about 75: missing alt text and unnamed links',
      'seo-score': 'Scores about 77: no meta description',
      lcp: 'Largest contentful paint is around 11 seconds on the throttled mobile profile',
    },
    // Tag Manager announces itself with a 'gtm.js' event once it has loaded.
    analytics: { vendors: ['gtm', 'ua'], dataLayerEvents: ['gtm.js'] },
    // The BookStore API behind the site's "Book Store Application" section.
    api: {
      basePath: '/BookStore/v1',
      endpoints: [
        {
          title: 'GET /Books returns the book catalogue',
          path: '/Books',
          status: 200,
          list: { arrayAt: 'books', itemKeys: ['isbn', 'title', 'author', 'pages'], minItems: 1 },
        },
        {
          title: 'GET /Book with an unknown ISBN is rejected with an error body',
          path: '/Book?ISBN=not-a-real-isbn',
          status: 400,
          keys: ['code', 'message'],
        },
      ],
    },
  },
  academybugs: {
    id: 'academybugs',
    displayName: 'Academy Bugs',
    baseUrls: {
      dev: 'https://academybugs.com',
      qa: 'https://academybugs.com',
      prod: 'https://academybugs.com',
    },
    a11yKnownIssues: {
      'color-contrast': 'Low-contrast text on the home page',
      'link-name': 'One home page link has no text or aria-label',
    },
    securityKnownIssues: {
      'strict-transport-security': 'No Strict-Transport-Security header on the HTTPS response',
      'x-content-type-options': 'X-Content-Type-Options header missing',
      'clickjacking-protection': 'No X-Frame-Options or frame-ancestors rule, so the page can be framed',
      'content-security-policy': 'No Content-Security-Policy header',
      'referrer-policy': 'No Referrer-Policy header; browsers fall back to their default',
      'cookie-flags': 'aiovg_rand_seed cookie is set without Secure, HttpOnly or SameSite',
      'info-disclosure': 'Server header reveals the nginx version (it varies between requests)',
    },
    seoKnownIssues: {
      'meta-description': 'No <meta name="description"> on the home page',
      'single-h1': 'Home page has no <h1>',
    },
    responsiveKnownIssues: {
      'tablet:no-horizontal-scroll': 'Home page is about 790px wide on a 768px tablet screen',
    },
    lighthouseKnownIssues: {
      lcp: 'Largest contentful paint is around 5 seconds on the throttled mobile profile',
    },
    linkKnownIssues: {
      'broken-links': '/academy-team/ is linked from the home page but returns 404',
    },
    analytics: { vendors: ['ga4'] },
    // WordPress ships a public REST API.
    api: {
      basePath: '/wp-json/wp/v2',
      endpoints: [
        {
          title: 'GET /posts returns a list of posts',
          path: '/posts?per_page=3',
          status: 200,
          list: { arrayAt: '', itemKeys: ['id', 'date', 'slug', 'title', 'content'], minItems: 1 },
        },
        {
          title: 'GET /posts/<unknown id> returns a 404 with an error body',
          path: '/posts/99999999',
          status: 404,
          keys: ['code', 'message'],
        },
      ],
    },
  },
  saucedemo: {
    id: 'saucedemo',
    displayName: 'Sauce Demo',
    baseUrls: {
      dev: 'https://www.saucedemo.com',
      qa: 'https://www.saucedemo.com',
      prod: 'https://www.saucedemo.com',
    },
    // Public demo logins; real ones belong in .env or CI secrets.
    credentials: {
      username: readVar('SAUCE_USERNAME') ?? 'standard_user',
      password: readVar('SAUCE_PASSWORD') ?? 'secret_sauce',
    },
    securityKnownIssues: {
      'strict-transport-security': 'Hosted on GitHub Pages, which does not allow custom headers',
      'x-content-type-options': 'Hosted on GitHub Pages, which does not allow custom headers',
      'clickjacking-protection': 'Hosted on GitHub Pages, which does not allow custom headers',
      'content-security-policy': 'Hosted on GitHub Pages, which does not allow custom headers',
      'referrer-policy': 'Hosted on GitHub Pages, which does not allow custom headers',
    },
    seoKnownIssues: {
      title: 'Page title is just "Swag Labs" (9 characters)',
      'meta-description': 'Meta description is only 24 characters',
      canonical: 'Single-page demo app declares no canonical URL',
      'single-h1': 'Home page has no <h1>',
      indexable: 'Deliberately noindex: it is a practice app, not meant to be searchable',
      sitemap: 'Demo app publishes no sitemap',
    },
    lighthouseKnownIssues: {
      'best-practices-score': 'Scores about 74 on the home page',
    },
    // An empty vendor list asserts that the site loads no analytics or tracking.
    analytics: { vendors: [] },
    // Static pages only: a baseline is useless if the page changes by itself.
    visual: [
      { name: 'login', path: '/' },
      { name: 'login-mobile', path: '/', viewport: { width: 375, height: 812 } },
    ],
  },
};

export function getSite(id: SiteId): SiteConfig {
  const site = sites[id];
  if (!site) {
    throw new Error(`Unknown site "${id}". Available sites: ${Object.keys(sites).join(', ')}`);
  }
  return site;
}

/** <SITE>_<ENV>_URL (for example DEMOQA_DEV_URL) wins over config, so real hosts need no code change. */
export function getBaseUrl(id: SiteId, env: TestEnv): string {
  return readVar(`${id}_${env}_URL`.toUpperCase()) ?? getSite(id).baseUrls[env];
}

/** Sites this run covers: the SITE filter if set, otherwise all of them. */
export function activeSites(): SiteConfig[] {
  const wanted = readVar('SITE')?.toLowerCase();
  if (!wanted) return Object.values(sites);
  if (!(wanted in sites)) {
    throw new Error(`SITE="${wanted}" is not registered. Add it to config/sites.ts or clear the variable.`);
  }
  return [sites[wanted as SiteId]];
}
