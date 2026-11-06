// One entry per site. The demo sites have a single host, so dev, qa and prod
// all point at it; for a real project set <SITE>_<ENV>_URL instead.
import { TestEnv, readVar } from './env';
import { AnalyticsVendorId } from './analytics-vendors';

export type SiteId = 'demoqa' | 'academybugs' | 'saucedemo';

export interface AnalyticsConfig {
  vendors: AnalyticsVendorId[];
  dataLayerName?: string;
  dataLayerEvents?: string[];
}

export interface ApiEndpoint {
  title: string;
  path: string;
  method?: 'GET' | 'POST';
  status: number;
  /** Expected list shape. `arrayAt` names the property holding it ('' when the body is the list). */
  list?: { arrayAt: string; itemKeys: string[]; minItems?: number };
  keys?: string[];
}

export interface ApiConfig {
  basePath?: string;
  maxResponseMs?: number;
  endpoints: ApiEndpoint[];
}

export interface VisualPage {
  name: string;
  path: string;
  mask?: string[];
  viewport?: { width: number; height: number };
  /** Share of pixels allowed to differ, 0-1. Default 0.002. */
  tolerance?: number;
}

// Category scores are 0-1, metrics are ms (CLS has no unit).
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
  responsiveKnownIssues?: Record<string, string>;
  i18nKnownIssues?: Record<string, string>;
  lighthouseKnownIssues?: Record<string, string>;
  linkKnownIssues?: Record<string, string>;

  analytics?: AnalyticsConfig;
  api?: ApiConfig;
  visual?: VisualPage[];
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
      'mobile:media-fits': 'An SVG (WB-u-E_TRWX.svg) is wider than the phone viewport',
      'tablet:media-fits': 'The same SVG (WB-u-E_TRWX.svg) is wider than a 768px tablet viewport',
    },
    lighthouseKnownIssues: {
      'performance-score': 'Scores about 58 on the throttled mobile profile, just under the 60 budget',
      'accessibility-score': 'Scores about 75: missing alt text and unnamed links',
      'seo-score': 'Scores about 77: no meta description',
      lcp: 'Largest contentful paint is around 11 seconds on the throttled mobile profile',
    },
    linkKnownIssues: {
      'links-found': 'Category cards are click handlers, not anchors, so there is nothing to crawl',
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
      'mobile:no-horizontal-scroll': 'Home page has a minimum width of about 790px, so it overflows phones',
      'tablet:no-horizontal-scroll': 'Same 790px minimum width overflows some tablet viewports',
    },
    lighthouseKnownIssues: {
      'performance-score': 'Scores in the 50s on the throttled mobile profile, and varies run to run',
      lcp: 'Largest contentful paint is around 5 seconds on the throttled mobile profile',
    },
    linkKnownIssues: {
      'broken-link:/academy-team/': 'Linked from the home page but returns 404',
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
    linkKnownIssues: {
      'links-found': 'The login page has no links',
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
  const name = `${id}_${env}_URL`.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return readVar(name) ?? getSite(id).baseUrls[env];
}

/** Sites this run covers: the SITE filter (one id or a comma-separated list), otherwise all. */
export function activeSites(): SiteConfig[] {
  const wanted = readVar('SITE')?.toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  if (!wanted?.length) return Object.values(sites);
  return wanted.map((id) => {
    if (!Object.prototype.hasOwnProperty.call(sites, id)) {
      throw new Error(`SITE="${id}" is not registered. Add it to config/sites.ts or clear the variable.`);
    }
    return sites[id as SiteId];
  });
}
