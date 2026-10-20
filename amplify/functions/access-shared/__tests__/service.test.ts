import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY, makeDeps } from './helpers';
import { authorizeRequest, exchangeToken, mintToken, buildLink, revokePersonLinks, issueSession } from '../service';
import { verifySession } from '../jwt';
import { sessionIdentity } from '../identity';

async function okExchange(deps: any, token: string) {
  const r = await exchangeToken(deps, token);
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') throw new Error('unreachable');
  return r;
}
const sec = (d: Date) => Math.floor(d.getTime() / 1000);

test('mint is stateless: no repo writes, no reads', async () => {
  const { deps, repo } = makeDeps();
  const m = mintToken(deps, 1);
  assert.equal(repo.reads, 0);
  assert.equal(m.expiresAt.toISOString(), '2026-04-01T00:00:00.000Z'); // 2026-01-01 + 90d
});

test('exchange: valid token -> 10h session; exactly one persons read', async () => {
  const { deps, repo, clock } = makeDeps();
  const m = mintToken(deps, 1);
  const r = await okExchange(deps, m.token);
  assert.equal(repo.reads, 1);
  assert.equal(r.email, 'alice@example.com');
  assert.deepEqual(r.allowedSources, ['DowJones', 'Unlicensed']);
  assert.equal(r.department, 'equity');
  assert.equal(r.rotated, false);
  assert.equal(r.linkToken, null);
  assert.equal(r.sessionExpiresAt - sec(clock.now()), 36000);
  assert.equal(r.linkTokenExpiresAt, sec(m.expiresAt));
  const v = verifySession(r.session, deps.keys, { issuer: 'jcnews-access', audience: 'equity.jcnews.ai', nowSec: sec(clock.now()) });
  assert.ok(v.ok);
});

test('exchange: multi-use (email scanners prefetch)', async () => {
  const { deps } = makeDeps();
  const m = mintToken(deps, 1);
  for (let i = 0; i < 5; i++) await okExchange(deps, m.token);
});

test('exchange: generic invalid for malformed / forged / unknown person / expired; no DB read for junk', async () => {
  const { deps, repo, clock } = makeDeps();
  for (const t of ['', 'x', Buffer.from('alice@example.com').toString('base64'), undefined, 42]) {
    assert.deepEqual(await exchangeToken(deps, t), { status: 'invalid' });
  }
  const m = mintToken(deps, 1);
  const forged = Buffer.from('v1.k1.2.20260101').toString('base64url') + '.' + m.token.split('.')[1];
  assert.deepEqual(await exchangeToken(deps, forged), { status: 'invalid' });
  assert.equal(repo.reads, 0, 'signature checked before any DB access');
  assert.deepEqual(await exchangeToken(deps, mintToken(deps, 999).token), { status: 'invalid' });
  clock.advance(90 * DAY);
  assert.deepEqual(await exchangeToken(deps, m.token), { status: 'invalid' });
});

test('rotation: none before 60d; at 60d a fresh token for today is returned; old stays valid to day 90', async () => {
  const { deps, clock } = makeDeps();
  const m = mintToken(deps, 1);
  clock.advance(59 * DAY + 3600);
  assert.equal((await okExchange(deps, m.token)).rotated, false);
  clock.advance(DAY);
  const r = await okExchange(deps, m.token);
  assert.equal(r.rotated, true);
  assert.notEqual(r.linkToken, m.token);
  assert.equal(r.linkTokenExpiresAt, sec(new Date(Date.UTC(2026, 2, 2) + 90 * DAY * 1000)));
  assert.equal((await okExchange(deps, r.linkToken!)).rotated, false);
  clock.advance(30 * DAY);
  assert.deepEqual(await exchangeToken(deps, m.token), { status: 'invalid' });
  assert.equal((await okExchange(deps, r.linkToken!)).rotated, false);
});

test('exchange.ok: one structured line with personId/rotated/kid only; never token, JWT or email', async () => {
  const { deps, clock } = makeDeps();
  const calls: Array<[string, Record<string, unknown> | undefined]> = [];
  deps.log = (m, extra) => { calls.push([m, extra]); };
  const m = mintToken(deps, 1);
  const r = await okExchange(deps, m.token);
  assert.deepEqual(calls.filter(([n]) => n === 'exchange.ok'), [['exchange.ok', { personId: 1, rotated: false, kid: 'k1' }]]);
  clock.advance(61 * DAY);
  calls.length = 0;
  const r2 = await okExchange(deps, m.token);
  assert.deepEqual(calls.filter(([n]) => n === 'exchange.ok'), [['exchange.ok', { personId: 1, rotated: true, kid: 'k1' }]]);
  assert.ok(calls.some(([n]) => n === 'exchange.rotated'));
  const serialized = JSON.stringify(calls);
  for (const secret of [m.token, r.session, r2.session, r2.linkToken!, 'alice@example.com']) {
    assert.ok(!serialized.includes(secret));
  }
});

test('exchange.ok: not logged for a denied exchange', async () => {
  const { deps } = makeDeps();
  const names: string[] = [];
  deps.log = (m) => { names.push(m); };
  assert.deepEqual(await exchangeToken(deps, 'junk'), { status: 'invalid' });
  assert.deepEqual(await exchangeToken(deps, mintToken(deps, 999).token), { status: 'invalid' });
  assert.deepEqual(names, ['exchange.denied', 'exchange.denied']);
});

test('revocation: tokens_valid_after rejects older tokens (incl. today); keepToday keeps today', async () => {
  const { deps, clock } = makeDeps();
  const old = mintToken(deps, 1).token;
  clock.advance(5 * DAY + 3600);
  const today = mintToken(deps, 1).token;
  await revokePersonLinks(deps, 1, { keepToday: true });
  assert.deepEqual(await exchangeToken(deps, old), { status: 'invalid' });
  await okExchange(deps, today);
  await revokePersonLinks(deps, 1);
  assert.deepEqual(await exchangeToken(deps, today), { status: 'invalid' });
  clock.advance(DAY);
  await okExchange(deps, mintToken(deps, 1).token); // next UTC day works again
  await okExchange(deps, mintToken(deps, 2).token); // other persons unaffected
});

test('authorizer: signature/expiry only, no DB; resolverContext from claims; ttl <= 300', async () => {
  const { deps, repo, clock } = makeDeps();
  const r = await okExchange(deps, mintToken(deps, 1).token);
  const reads = repo.reads;
  repo.persons.delete(1); // even a deleted person keeps the session until expiry (accepted)
  const a = authorizeRequest(deps, `Bearer ${r.session}`);
  assert.equal(repo.reads, reads);
  assert.equal(a.isAuthorized, true);
  assert.equal(a.ttlOverride, 300);
  assert.deepEqual(a.resolverContext, { email: 'alice@example.com', personId: '1',
    allowedSources: '["DowJones","Unlicensed"]', department: 'equity' });
  clock.advance(36000 - 100);
  assert.equal(authorizeRequest(deps, r.session).ttlOverride, 100);
  clock.advance(100);
  assert.equal(authorizeRequest(deps, r.session).isAuthorized, false);
});

test('authorizer: denies garbage, tampered and foreign-key sessions', async () => {
  const { deps, repo } = makeDeps();
  assert.equal(authorizeRequest(deps, undefined).isAuthorized, false);
  assert.equal(authorizeRequest(deps, 'abc').isAuthorized, false);
  const s = issueSession(deps, (await repo.findPersonById(2))!, deps.now!()).jwt;
  const [h, p, sig] = s.split('.');
  const body = JSON.parse(Buffer.from(p, 'base64url').toString());
  body.src = ['DowJones'];
  assert.equal(authorizeRequest(deps, `${h}.${Buffer.from(JSON.stringify(body)).toString('base64url')}.${sig}`).isAuthorized, false);
  const other = { ...deps, keys: { activeKid: 'default', keys: { default: 'another-secret-another-secret-0123456789' } } };
  assert.equal(authorizeRequest(other, s).isAuthorized, false);
});

test('buildLink keeps ticker and never includes email', () => {
  assert.equal(buildLink('https://equity.jcnews.ai/', 'TOK', 'AAPL US'), 'https://equity.jcnews.ai/?ticker=AAPL+US&token=TOK');
  assert.equal(buildLink('https://equity.jcnews.ai', 'TOK'), 'https://equity.jcnews.ai/?token=TOK');
});

test('sessionIdentity: reads authorizer context; default-deny on bad sources; null for guest', () => {
  assert.equal(sessionIdentity({ identity: { cognitoIdentityId: 'x' } }), null);
  assert.equal(sessionIdentity({}), null);
  const id = sessionIdentity({ identity: { resolverContext: { email: 'a@example.com', allowedSources: '["DowJones"]', personId: '1', department: 'options' } } })!;
  assert.deepEqual(id.allowedSources, ['DowJones']);
  assert.equal(id.department, 'options');
  assert.deepEqual(sessionIdentity({ identity: { resolverContext: { email: 'a@example.com', allowedSources: '{bad' } } })!.allowedSources, []);
});
