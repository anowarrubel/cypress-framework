import fs from 'node:fs';
import path from 'node:path';

export type FindingStatus = 'pass' | 'fail' | 'known-issue' | 'known-issue-fixed';

export interface FindingRecord {
  suite: string;
  site: string;
  env: string;
  browser: string;
  id: string;
  title: string;
  status: FindingStatus;
  detail: string;
  reason?: string;
}

const FILE = path.join('reports', 'findings.jsonl');

/** Appends one line per finding; scripts/summary.mjs turns the file into the CI summary. */
export function recordFinding(record: FindingRecord): null {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.appendFileSync(FILE, `${JSON.stringify(record)}\n`);
  return null;
}
