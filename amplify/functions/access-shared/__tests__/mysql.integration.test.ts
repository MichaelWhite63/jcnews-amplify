/**
 * Integration tests against a real MySQL (docker-compose in local-dev/, or any MySQL 8 / MariaDB).
 * Skipped unless ACCESS_TEST_DB=1 and ACCESS_DB_HOST etc. are set (see LOCAL_TESTING.md).
 * Uses the fake seed persons (ids 1001-1003) and resets only their tokens_valid_after.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'mysql2/promise';
import { createAccessPool } from '../runtime';
import { MysqlAccessRepo } from '../mysqlRepo';
import { loadConfig } from '../config';
import { parseJwtKeys } from '../jwt';
import { parseLinkKeys } from '../linkToken';
import { exchangeToken, mintToken, revokePersonLinks, type AccessDeps } from '../service';
import { DAY, TEST_LINK_SECRET, TEST_SECRET, makeClock } from './helpers';

const enabled = process.env.ACCESS_TEST_DB === '1' && !!process.env.ACCESS_DB_HOST;
let pool: Pool;
let repo: MysqlAccessRepo;
const t0 = new Date(Date.UTC(2031, 0, 1, 12));
const reset = () => pool.query('UPDATE persons SET tokens_valid_after = NULL WHERE id IN (1001,1002,1003)');

before(async () => {
  if (!enabled) return;
  pool = await createAccessPool({
    host: process.env.ACCESS_DB_HOST!, port: Number(process.env.ACCESS_DB_PORT || 3306),
    user: process.env.ACCESS_DB_USER || 'root', password: process.env.ACCESS_DB_PASSWORD || '',
    database: process.env.ACCESS_DB_NAME || 'in4mdatabase',
  });
  repo = new MysqlAccessRepo(pool);
  await reset();
});
after(async () => { if (!enabled) return; await reset(); await pool.end(); });

function deps(clock = makeClock(t0)): AccessDeps {
  return {
    repo, keys: parseJwtKeys(TEST_SECRET), linkKeys: parseLinkKeys(TEST_LINK_SECRET), now: clock.now,
    config: loadConfig({ ACCESS_APP_BASE_URL: 'http://localhost:5173' }),
  };
}

test('mysql: exchange, revocation via tokens_valid_after (UTC round trip), keepToday', { skip: !enabled }, async () => {
  const clock = makeClock(t0);
  const d = deps(clock);
  const tok = mintToken(d, 1001).token;
  const r1 = await exchangeToken(d, tok);
  assert.equal(r1.status, 'ok');
  if (r1.status !== 'ok') return;
  assert.equal(r1.email, 'alice.equity@example.com');
  assert.deepEqual(r1.allowedSources, ['Unlicensed', 'DowJones']);

  const { validAfter } = await revokePersonLinks(d, 1001);
  assert.equal((await repo.findPersonById(1001))!.tokensValidAfter!.toISOString(), validAfter.toISOString(), 'DATETIME stored/read as UTC');
  assert.equal((await exchangeToken(d, tok)).status, 'invalid');
  assert.equal((await exchangeToken(d, mintToken(d, 1002).token)).status, 'ok', 'other person unaffected');
  clock.advance(DAY);
  const tomorrow = mintToken(d, 1001).token;
  assert.equal((await exchangeToken(d, tomorrow)).status, 'ok');
  clock.advance(DAY);
  await revokePersonLinks(d, 1001, { keepToday: true });
  assert.equal((await exchangeToken(d, tomorrow)).status, 'invalid');
  assert.equal((await exchangeToken(d, mintToken(d, 1001).token)).status, 'ok');
});
