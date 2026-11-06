import type { Finding } from '../findings';

export interface Viewport {
  name: string;
  width: number;
  height: number;
}

export const VIEWPORTS: Viewport[] = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
];

/** Layout facts read from the page at one viewport size. */
export interface LayoutSnapshot {
  viewportWidth: number;
  scrollWidth: number;
  hasViewportMeta: boolean;
  /** Images, video and iframes wider than the viewport. */
  tooWide: string[];
  baseFontSizePx: number;
}

export function readLayout(win: Window): LayoutSnapshot {
  const doc = win.document;
  const viewportWidth = doc.documentElement.clientWidth;
  const tooWide = Array.from(doc.querySelectorAll('img, video, iframe'))
    .filter((el) => el.getBoundingClientRect().width > viewportWidth + 1 && win.getComputedStyle(el).display !== 'none')
    .map((el) => el.getAttribute('src') ?? el.tagName.toLowerCase());
  return {
    viewportWidth,
    scrollWidth: doc.documentElement.scrollWidth,
    hasViewportMeta: Boolean(doc.querySelector('meta[name="viewport"]')),
    tooWide,
    baseFontSizePx: parseFloat(win.getComputedStyle(doc.body).fontSize),
  };
}

export interface LayoutCheck {
  id: string;
  title: string;
  run: (s: LayoutSnapshot) => Pick<Finding, 'passed' | 'detail'>;
}

export const LAYOUT_CHECKS: LayoutCheck[] = [
  {
    id: 'viewport-meta',
    title: 'Page has a viewport meta tag',
    run: (s) => ({ passed: s.hasViewportMeta, detail: s.hasViewportMeta ? 'present' : 'missing' }),
  },
  {
    id: 'no-horizontal-scroll',
    title: 'Page does not scroll sideways',
    run: (s) => ({
      passed: s.scrollWidth <= s.viewportWidth + 1,
      detail: `content is ${s.scrollWidth}px wide in a ${s.viewportWidth}px viewport`,
    }),
  },
  {
    id: 'media-fits',
    title: 'Images and media fit inside the viewport',
    run: (s) => ({
      passed: s.tooWide.length === 0,
      detail: s.tooWide.length ? `${s.tooWide.length} too wide, e.g. ${s.tooWide[0]}` : 'all fit',
    }),
  },
  {
    id: 'readable-text',
    title: 'Body text is at least 14px',
    run: (s) => ({ passed: s.baseFontSizePx >= 14, detail: `${s.baseFontSizePx}px` }),
  },
];
