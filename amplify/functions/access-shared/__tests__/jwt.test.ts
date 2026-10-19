import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { parseJwtKeys, signSession, verifySession, type SessionClaims } from '../jwt';
import { TEST_SECRET } from './helpers';

const keys = parseJwtKeys(TEST_SECRET);
const opts = { issuer: 'jcnews-access', audience: 'equity.jcnews.ai' };
const base = (now: number): SessionClaims => ({
  iss: 'jcnews-access', aud: 'equity.jcnews.ai', sub: 'alice@example.com', pid: 1, src: ['DowJones'],
  dep: 'equity', iat: now, exp: now + 36000,
});

test('sign/verify round trip', () => {
  const now = 1_800_000_000;
  const jwt = signSession(base(now), keys);
  const v = verifySession(jwt, keys, { ...opts, nowSec: now + 10 });
  assert.ok(v.ok);
  if (v.ok) assert.equal(v.claims.sub, 'alice@example.com');
});

test('rejects tampered payload, wrong key, wrong audience', () => {
  const now = 1_800_000_000;
  const jwt = signSession(base(now), keys);
  const [h, , s] = jwt.split('.');
  const evil = Buffer.from(JSON.stringify({ ...base(now), sub: 'mallory@example.com' })).toString('base64url');
  assert.deepEqual(verifySession(`${h}.${evil}.${s}`, keys, { ...opts, nowSec: now }), { ok: false, reason: 'bad_signature' });
  assert.equal(verifySession(jwt, parseJwtKeys('another-secret-another-secret-another-secret'), { ...opts, nowSec: now }).ok, false);
  assert.deepEqual(verifySession(jwt, keys, { issuer: 'jcnews-access', audience: 'other', nowSec: now }), { ok: false, reason: 'wrong_audience' });
});

test('rejects expired tokens (with and without leeway)', () => {
  const now = 1_800_000_000;
  const jwt = signSession({ ...base(now), exp: now + 60 }, keys);
  assert.ok(verifySession(jwt, keys, { ...opts, nowSec: now + 59, leewaySec: 0 }).ok);
  assert.deepEqual(verifySession(jwt, keys, { ...opts, nowSec: now + 60, leewaySec: 0 }), { ok: false, reason: 'expired' });
  assert.ok(verifySession(jwt, keys, { ...opts, nowSec: now + 80, leewaySec: 30 }).ok);
});

test('rejects alg=none and non-HS256 headers', () => {
  const now = 1_800_000_000;
  const p = Buffer.from(JSON.stringify(base(now))).toString('base64url');
  const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  assert.equal(verifySession(`${none}.${p}.`, keys, { ...opts, nowSec: now }).ok, false);
  const hs512 = Buffer.from(JSON.stringify({ alg: 'HS512', typ: 'JWT', kid: 'default' })).toString('base64url');
  const sig = createHmac('sha256', TEST_SECRET).update(`${hs512}.${p}`).digest('base64url');
  assert.equal(verifySession(`${hs512}.${p}.${sig}`, keys, { ...opts, nowSec: now }).ok, false);
  assert.deepEqual(verifySession('garbage', keys, { ...opts, nowSec: now }), { ok: false, reason: 'malformed' });
});

test('key rotation via kid: old sessions verify, new ones use the active key', () => {
  const now = 1_800_000_000;
  const k1 = 'k1-secret-k1-secret-k1-secret-k1-secret-xx';
  const k2 = 'k2-secret-k2-secret-k2-secret-k2-secret-xx';
  const before = parseJwtKeys(JSON.stringify({ activeKid: 'k1', keys: { k1 } }));
  const after = parseJwtKeys(JSON.stringify({ activeKid: 'k2', keys: { k1, k2 } }));
  const old = signSession(base(now), before);
  assert.ok(verifySession(old, after, { ...opts, nowSec: now }).ok);
  const fresh = signSession(base(now), after);
  assert.equal(JSON.parse(Buffer.from(fresh.split('.')[0], 'base64url').toString()).kid, 'k2');
  assert.equal(verifySession(fresh, before, { ...opts, nowSec: now }).ok, false);
});

test('refuses weak secrets', () => {
  assert.throws(() => signSession(base(1), parseJwtKeys('short')));
});
