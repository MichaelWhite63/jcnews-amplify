import { loadConfig, type AccessConfig } from '../config';
import { parseJwtKeys } from '../jwt';
import { parseLinkKeys } from '../linkToken';
import { MemoryAccessRepo } from '../repo';
import type { AccessDeps } from '../service';

export const DAY = 86400;
export const TEST_SECRET = 'test-secret-test-secret-test-secret-0123456789';
export const TEST_LINK_SECRET = '{"activeKid":"k1","keys":{"k1":"test-link-key-test-link-key-0123456789"}}';
/** Golden vector shared with subscriptionServer/test/linkToken.test.ts — DO NOT change without both repos. */
export const GOLDEN = {
  keys: '{"activeKid":"k1","keys":{"k1":"golden-vector-link-key-0123456789abcdef"}}',
  personId: 1001,
  at: '2026-10-19T15:00:00Z',
  token: 'djEuazEuMTAwMS4yMDI2MTAxOQ.Di-u8gP1ODHRwlplLFgZ8B-uylnQ0fAXVhmkuGaxGCA',
};

export function makeClock(start = new Date('2026-01-01T00:00:00Z')) {
  let t = start.getTime();
  return {
    now: () => new Date(t),
    advance: (sec: number) => { t += sec * 1000; },
  };
}

export function makeDeps(overrides: Partial<Record<string, string>> = {}) {
  const clock = makeClock();
  const repo = new MemoryAccessRepo();
  repo.addPerson({ id: 1, email: 'alice@example.com', departmentName: 'Equities',
    accessList: '[{"Source":"DowJones","Permission":true},{"Source":"Unlicensed","Permission":true},{"Source":"X","Permission":false}]' });
  repo.addPerson({ id: 2, email: 'oscar@example.com', departmentName: 'Options Desk', accessList: '[]' });
  const config: AccessConfig = loadConfig({
    ACCESS_SESSION_TTL: '10h', ACCESS_TOKEN_TTL: '90d', ACCESS_ROTATE_AFTER: '60d',
    ACCESS_APP_BASE_URL: 'http://localhost:5173', ...overrides,
  });
  const logs: string[] = [];
  const deps: AccessDeps = { repo, config, keys: parseJwtKeys(TEST_SECRET), linkKeys: parseLinkKeys(TEST_LINK_SECRET),
    now: clock.now, log: (m) => logs.push(m) };
  return { deps, repo, clock, logs, config };
}
