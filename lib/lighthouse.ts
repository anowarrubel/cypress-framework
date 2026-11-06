import { execFile } from 'node:child_process';
import path from 'node:path';

export interface LighthouseSummary {
  finalUrl: string;
  lighthouseVersion: string;
  scores: Record<string, number | null>;
  metrics: Record<'fcp' | 'lcp' | 'cls' | 'tbt' | 'speedIndex' | 'ttfb', number | null>;
}

export function runLighthouse(url: string, formFactor: 'mobile' | 'desktop', reportPath: string): Promise<LighthouseSummary> {
  const runner = path.join(__dirname, 'lighthouse-runner.mjs');
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [runner, url, formFactor, reportPath],
      { maxBuffer: 10 * 1024 * 1024, timeout: 180_000 },
      (error, stdout, stderr) => {
        if (error) return reject(new Error(`Lighthouse failed for ${url}: ${stderr.trim() || error.message}`));
        try {
          resolve(JSON.parse(stdout.trim().split('\n').pop() ?? ''));
        } catch {
          reject(new Error(`Lighthouse printed something unexpected for ${url}: ${stdout.slice(0, 300)}`));
        }
      },
    );
  });
}
