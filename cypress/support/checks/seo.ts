import type { Finding } from '../findings';

/** SEO signals read from the rendered page plus robots.txt and the sitemap. */
export interface SeoSnapshot {
  url: string;
  title: string;
  description: string | null;
  canonical: string | null;
  lang: string | null;
  viewport: string | null;
  h1Count: number;
  robotsMeta: string | null;
  robotsTxtStatus: number;
  /** 200 and the body looks like a robots file, not an HTML fallback page. */
  robotsTxtValid: boolean;
  hasSitemap: boolean;
}

export interface SeoCheck {
  id: string;
  title: string;
  run: (s: SeoSnapshot) => Pick<Finding, 'passed' | 'detail'>;
}

/** Read from the live document, so client-rendered pages are judged on what users get. */
export function readDom(doc: Document) {
  const meta = (name: string) => doc.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? null;
  return {
    title: doc.title,
    description: meta('description'),
    canonical: doc.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null,
    lang: doc.documentElement.getAttribute('lang'),
    viewport: meta('viewport'),
    h1Count: doc.querySelectorAll('h1').length,
    robotsMeta: meta('robots'),
  };
}

/** Single-page apps often answer every path with their HTML shell and a 200, so check the body. */
export const looksLikeRobotsFile = (body: string) => /^\s*(user-agent|disallow|allow|sitemap):/im.test(body);
export const looksLikeSitemap = (body: string) => /<(urlset|sitemapindex)\b/.test(body);

export const SEO_CHECKS: SeoCheck[] = [
  {
    id: 'title',
    title: 'Page has a title of 10-70 characters',
    run: (s) => ({ passed: s.title.length >= 10 && s.title.length <= 70, detail: `"${s.title}" (${s.title.length} characters)` }),
  },
  {
    id: 'meta-description',
    title: 'Page has a meta description of 50-160 characters',
    run: (s) => {
      const length = s.description?.length ?? 0;
      return { passed: length >= 50 && length <= 160, detail: s.description ? `${length} characters` : 'meta description missing' };
    },
  },
  {
    id: 'canonical',
    title: 'Page declares a canonical URL',
    run: (s) => ({ passed: Boolean(s.canonical), detail: s.canonical ?? 'canonical link missing' }),
  },
  {
    id: 'html-lang',
    title: '<html> has a lang attribute',
    run: (s) => ({ passed: Boolean(s.lang), detail: s.lang ?? 'lang attribute missing' }),
  },
  {
    id: 'viewport',
    title: 'Page has a viewport meta tag (mobile friendly)',
    run: (s) => ({ passed: Boolean(s.viewport), detail: s.viewport ?? 'viewport meta missing' }),
  },
  {
    id: 'single-h1',
    title: 'Page has exactly one <h1>',
    run: (s) => ({ passed: s.h1Count === 1, detail: `found ${s.h1Count}` }),
  },
  {
    id: 'indexable',
    title: 'Page is not blocked from indexing (no noindex)',
    run: (s) => ({ passed: !/noindex/i.test(s.robotsMeta ?? ''), detail: s.robotsMeta ?? 'no robots meta tag' }),
  },
  {
    id: 'robots-txt',
    title: 'robots.txt is reachable',
    run: (s) => ({
      passed: s.robotsTxtValid,
      detail: `HTTP ${s.robotsTxtStatus}, ${s.robotsTxtValid ? 'valid robots file' : 'no robots directives in body'}`,
    }),
  },
  {
    id: 'sitemap',
    title: 'A sitemap is declared in robots.txt or served at /sitemap.xml',
    run: (s) => ({ passed: s.hasSitemap, detail: s.hasSitemap ? 'sitemap found' : 'no sitemap found' }),
  },
];
