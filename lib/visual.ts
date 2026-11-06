import fs from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface CompareRequest {
  /** Where Cypress saved the fresh screenshot. */
  actualPath: string;
  /** Where the approved baseline lives (or should be written). */
  baselinePath: string;
  diffPath: string;
  /** Overwrite the baseline with the fresh screenshot. */
  update: boolean;
  /** Share of pixels allowed to differ, 0-1. */
  tolerance: number;
}

export interface CompareResult {
  status: 'match' | 'mismatch' | 'size-changed' | 'no-baseline' | 'baseline-written';
  differentPixels: number;
  totalPixels: number;
  ratio: number;
  message: string;
}

const read = (file: string) => PNG.sync.read(fs.readFileSync(file));

export function compareSnapshot(req: CompareRequest): CompareResult {
  const empty = { differentPixels: 0, totalPixels: 0, ratio: 0 };

  if (req.update || !fs.existsSync(req.baselinePath)) {
    if (!req.update) {
      return { ...empty, status: 'no-baseline', message: `No baseline at ${req.baselinePath}. Run with --update to create it, review the image, then commit it.` };
    }
    fs.mkdirSync(path.dirname(req.baselinePath), { recursive: true });
    fs.copyFileSync(req.actualPath, req.baselinePath);
    return { ...empty, status: 'baseline-written', message: `Baseline written to ${req.baselinePath}` };
  }

  const baseline = read(req.baselinePath);
  const actual = read(req.actualPath);
  const totalPixels = baseline.width * baseline.height;

  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    return {
      status: 'size-changed',
      differentPixels: totalPixels,
      totalPixels,
      ratio: 1,
      message: `Size changed: baseline is ${baseline.width}x${baseline.height}, now ${actual.width}x${actual.height}`,
    };
  }

  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const differentPixels = pixelmatch(baseline.data, actual.data, diff.data, baseline.width, baseline.height, { threshold: 0.1 });
  const ratio = differentPixels / totalPixels;

  if (ratio <= req.tolerance) {
    return { status: 'match', differentPixels, totalPixels, ratio, message: `${differentPixels} pixels differ (${(ratio * 100).toFixed(2)}%)` };
  }

  fs.mkdirSync(path.dirname(req.diffPath), { recursive: true });
  fs.writeFileSync(req.diffPath, PNG.sync.write(diff));
  return {
    status: 'mismatch',
    differentPixels,
    totalPixels,
    ratio,
    message: `${differentPixels} pixels differ (${(ratio * 100).toFixed(2)}%, allowed ${(req.tolerance * 100).toFixed(2)}%). Diff image: ${req.diffPath}`,
  };
}
