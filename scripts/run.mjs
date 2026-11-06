#!/usr/bin/env node
/**
 * Test launcher.
 *   npm run t -- demoqa prod seo            (chrome, headless)
 *   npm run t -- demoqa:prod:seo:firefox
 *   npm run t -- --suite=security,seo --site=saucedemo --env=prod --headed
 *
 * Flags: --suite --site --env --browser, --headed --open --update --yes.
 * Anything after a second "--" goes to `cypress run`. Run bare in a terminal
 * for a menu (never shown in CI).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: join(root, '.env'), quiet: true });

const SUITES = {
  functional: 'functional',
  config: 'config',
  accessibility: 'accessibility',
  security: 'security',
  seo: 'seo',
  analytics: 'analytics',
  performance: 'performance',
  responsive: 'responsive',
  api: 'api',
  visual: 'visual',
  i18n: 'i18n',
  links: 'links',
};
const BROWSERS = ['chrome', 'firefox', 'edge', 'electron'];
const ALIASES = { a11y: 'accessibility', e2e: 'functional', perf: 'performance', lighthouse: 'performance', mobile: 'responsive' };
const VALUE_FLAGS = ['suite', 'site', 'env', 'browser'];
const SWITCH_FLAGS = ['headed', 'open', 'update', 'yes'];

// Sites and environments come from their type definitions, so adding one
// there is enough.
const unionOf = (file, type) => {
  const source = readFileSync(join(root, 'config', file), 'utf8');
  const body = new RegExp(`export type ${type} = ([^;]+);`).exec(source)?.[1] ?? '';
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
};
const SITES = unionOf('sites.ts', 'SiteId');
const ENVS = unionOf('env.ts', 'TestEnv');

function fail(message) {
  console.error(message);
  process.exit(1);
}

const argv = process.argv.slice(2);
const split = argv.indexOf('--');
const ownArgs = split === -1 ? argv : argv.slice(0, split);
const passthrough = split === -1 ? [] : argv.slice(split + 1);

const known = (w) => [...SITES, ...ENVS, ...BROWSERS, ...Object.keys(SUITES), ...Object.keys(ALIASES)].includes(w);

// Forgetting the bare "--" (npm run t demoqa:prod:seo) makes npm swallow the
// words as its own options; they still arrive as npm_config_* variables.
const fromNpm = Object.keys(process.env)
  .filter((k) => k.startsWith('npm_config_'))
  .map((k) => k.slice('npm_config_'.length))
  .filter((k) => k.split(':').every(known));

const flags = {};
for (const flag of SWITCH_FLAGS) {
  if (process.env[`npm_config_${flag}`] === 'true') flags[flag] = true;
}

for (const arg of [...fromNpm, ...ownArgs]) {
  const m = /^--([\w-]+)(?:=(.*))?$/.exec(arg);
  if (m) {
    const [, name, value] = m;
    if (VALUE_FLAGS.includes(name)) {
      if (!value) fail(`--${name} needs a value, e.g. --${name}=<value>`);
      flags[name] = value;
    } else if (SWITCH_FLAGS.includes(name)) {
      flags[name] = true;
    } else {
      fail(`Unknown flag --${name}. Valid flags: ${[...VALUE_FLAGS, ...SWITCH_FLAGS].map((f) => `--${f}`).join(' ')}`);
    }
    continue;
  }
  for (const raw of arg.split(':').filter(Boolean)) {
    const word = ALIASES[raw] ?? raw;
    if (word === 'all') continue;
    if (SITES.includes(word)) flags.site = flags.site ? `${flags.site},${word}` : word;
    else if (ENVS.includes(word)) flags.env = word;
    else if (BROWSERS.includes(word)) flags.browser = word;
    else if (Object.hasOwn(SUITES, word)) flags.suite = flags.suite ? `${flags.suite},${word}` : word;
    else fail(`Don't know "${raw}". Sites: ${SITES.join(', ')} | envs: ${ENVS.join(', ')} | browsers: ${BROWSERS.join(', ')} | suites: ${Object.keys(SUITES).join(', ')}`);
  }
}

function check(label, values, allowed, extra = []) {
  for (const v of values) {
    if (![...allowed, ...extra].includes(v)) fail(`Unknown ${label} "${v}". Choose from: ${[...extra, ...allowed].join(', ')}`);
  }
}

async function choose(rl, question, options, fallback) {
  console.log(`\n${question}`);
  options.forEach((o, i) => console.log(`  ${i + 1}) ${o}`));
  const answer = (await rl.question(`Choose [${fallback}]: `)).trim();
  if (!answer) return fallback;
  return answer.split(',').map((a) => options[Number(a) - 1] ?? a.trim()).join(',');
}

const anyChoice = VALUE_FLAGS.some((k) => flags[k]);
const interactive = process.stdin.isTTY && !process.env.CI && !flags.yes && !anyChoice;
let { suite, site, env, browser } = flags;

if (interactive) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  suite = await choose(rl, 'Which tests? (numbers or names, comma-separated for several)', ['all', ...Object.keys(SUITES)], 'all');
  site = await choose(rl, 'Which site?', ['all', ...SITES], 'all');
  env = await choose(rl, 'Which environment?', ENVS, process.env.TEST_ENV || 'qa');
  browser = await choose(rl, 'Which browser?', BROWSERS, 'chrome');
  rl.close();
}

suite = (suite || 'all').split(',').map((s) => ALIASES[s.trim()] ?? s.trim());
site = site || 'all';
if (site.split(',').includes('all')) site = 'all';
env = env || process.env.TEST_ENV || 'qa';
browser = browser || 'chrome';

check('suite', suite, Object.keys(SUITES), ['all']);
check('site', site.split(','), SITES, ['all']);
check('env', [env], ENVS);
check('browser', [browser], BROWSERS);

const specs = suite.includes('all') ? [] : suite.map((s) => `cypress/e2e/${SUITES[s]}/**/*.cy.ts`);

const args = [flags.open ? 'open' : 'run', '--browser', browser];
if (flags.open) args.push('--e2e');
else if (flags.headed) args.push('--headed');
if (specs.length) args.push('--spec', specs.join(','));
args.push(...passthrough);

// An empty SITE means "all" and, unlike an unset one, stops .env from filling it back in.
const childEnv = {
  ...process.env,
  TEST_ENV: env,
  SITE: site === 'all' ? '' : site,
  ...(flags.update ? { UPDATE_SNAPSHOTS: '1' } : {}),
};

console.log(`\n> suite=${suite.join(',')} site=${site} env=${env} browser=${browser}\n`);

// Findings from an earlier run would leak into this run's summary.
rmSync(join(root, 'reports', 'findings.jsonl'), { force: true });
mkdirSync(join(root, 'reports'), { recursive: true });

const bin = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'cypress.cmd' : 'cypress');
const child = spawn(bin, args, { cwd: root, env: childEnv, stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', (code) => process.exit(code ?? 1));
