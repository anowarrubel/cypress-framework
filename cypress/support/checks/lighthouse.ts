import type { LighthouseSummary } from '../../../lib/lighthouse';
import type { LighthouseBudget } from '../../../config/sites';
import type { Finding } from '../findings';

export interface LighthouseCheck {
  id: string;
  title: string;
  run: (r: LighthouseSummary, budget: LighthouseBudget) => Pick<Finding, 'passed' | 'detail'>;
}

const pct = (score: number | null | undefined) => (score == null ? 'n/a' : `${Math.round(score * 100)}`);
const ms = (value: number | null) => (value == null ? 'not reported' : `${Math.round(value)} ms`);

const category = (id: 'performance' | 'accessibility' | 'best-practices' | 'seo', title: string): LighthouseCheck => ({
  id: `${id}-score`,
  title,
  run: (r, b) => ({
    passed: (r.scores[id] ?? 0) >= b[id],
    detail: `score ${pct(r.scores[id])} (minimum ${pct(b[id])})`,
  }),
});

export const LIGHTHOUSE_CHECKS: LighthouseCheck[] = [
  category('performance', 'Lighthouse performance score meets the budget'),
  category('accessibility', 'Lighthouse accessibility score meets the budget'),
  category('best-practices', 'Lighthouse best-practices score meets the budget'),
  category('seo', 'Lighthouse SEO score meets the budget'),
  {
    id: 'lcp',
    title: 'Largest contentful paint is within budget',
    run: (r, b) => ({ passed: r.metrics.lcp !== null && r.metrics.lcp <= b.lcp, detail: `${ms(r.metrics.lcp)} (budget ${b.lcp} ms)` }),
  },
  {
    id: 'cls',
    title: 'Cumulative layout shift is within budget',
    run: (r, b) => ({ passed: r.metrics.cls !== null && r.metrics.cls <= b.cls, detail: `${(r.metrics.cls ?? 0).toFixed(3)} (budget ${b.cls})` }),
  },
  {
    id: 'tbt',
    title: 'Total blocking time is within budget',
    run: (r, b) => ({ passed: r.metrics.tbt !== null && r.metrics.tbt <= b.tbt, detail: `${ms(r.metrics.tbt)} (budget ${b.tbt} ms)` }),
  },
];
