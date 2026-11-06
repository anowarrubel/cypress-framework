#!/usr/bin/env node
/**
 * Runs one Lighthouse audit and prints a JSON summary to stdout.
 *   node lib/lighthouse-runner.mjs <url> <mobile|desktop> <html-report-path>
 *
 * Lighthouse is ESM-only and wants its own Chrome, so it runs as a child
 * process of the Cypress task rather than inside the Cypress config.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const [url, formFactor = 'mobile', reportPath] = process.argv.slice(2);
if (!url) {
  console.error('usage: lighthouse-runner.mjs <url> <mobile|desktop> [html-report-path]');
  process.exit(2);
}

const chrome = await chromeLauncher.launch({
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

// The Cypress task kills this process on timeout; take Chrome down with it.
process.on('SIGTERM', async () => {
  await chrome.kill();
  process.exit(1);
});

try {
  const flags = {
    port: chrome.port,
    output: ['json', 'html'],
    logLevel: 'error',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor,
    ...(formFactor === 'desktop'
      ? { screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }, throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 } }
      : {}),
  };
  const result = await lighthouse(url, flags);
  const { lhr } = result;
  if (lhr.runtimeError) throw new Error(`${lhr.runtimeError.code}: ${lhr.runtimeError.message}`);

  if (reportPath) {
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, result.report[1]);
  }

  const audit = (id) => lhr.audits[id]?.numericValue ?? null;
  console.log(
    JSON.stringify({
      finalUrl: lhr.finalDisplayedUrl,
      lighthouseVersion: lhr.lighthouseVersion,
      scores: Object.fromEntries(Object.entries(lhr.categories).map(([id, c]) => [id, c.score])),
      metrics: {
        fcp: audit('first-contentful-paint'),
        lcp: audit('largest-contentful-paint'),
        cls: audit('cumulative-layout-shift'),
        tbt: audit('total-blocking-time'),
        speedIndex: audit('speed-index'),
        ttfb: audit('server-response-time'),
      },
    }),
  );
} finally {
  await chrome.kill();
}
