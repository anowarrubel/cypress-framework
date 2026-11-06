// Loaded by Node (config, tasks) and by the spec bundle in the browser;
// only the latter has Cypress.env(), hence readVar().

export type TestEnv = 'dev' | 'qa' | 'prod';

const VALID_ENVS: TestEnv[] = ['dev', 'qa', 'prod'];

type CypressGlobal = { env(name: string): unknown };

export function readVar(name: string): string | undefined {
  const cypress = (globalThis as { Cypress?: CypressGlobal }).Cypress;
  const value = cypress ? cypress.env(name) : process.env[name];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

export function getCurrentEnv(): TestEnv {
  const raw = (readVar('TEST_ENV') ?? 'qa').toLowerCase();
  if (!VALID_ENVS.includes(raw as TestEnv)) {
    throw new Error(`Invalid TEST_ENV="${raw}". Expected one of: ${VALID_ENVS.join(', ')}`);
  }
  return raw as TestEnv;
}
