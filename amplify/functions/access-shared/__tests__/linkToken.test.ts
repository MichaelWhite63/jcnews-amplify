import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mintLinkToken, parseLinkKeys, verifyLinkToken, utcDay, dayStart } from '../linkToken';
import { DAY, GOLDEN, TEST_LINK_SECRET } from './helpers';

const TTL = 90 * DAY;
const ring = parseLinkKeys(TEST_LINK_SECRET);
const at = new Date('2026-10-19T15:00:00Z');

test('golden vector (shared with subscriptionServer)', () => {
  const g = parseLinkKeys(GOLDEN.keys);
  assert.equal(mintLinkToken(g, GOLDEN.personId, new Date(GOLDEN.at)), GOLDEN.token);
  const v = verifyLinkToken(g, GOLDEN.token, new Date(GOLDEN.at), TTL);
  assert.ok(v.ok && v.claims.personId === 1001 && v.claims.issuedDay === '20261019' && v.claims.kid === 'k1');
});

test('deterministic per person+UTC day; differs across days/persons', () => {
  assert.equal(mintLinkToken(ring, 1, at), mintLinkToken(ring, 1, new Date('2026-10-19T23:59:59.999Z')));
  assert.notEqual(mintLinkToken(ring, 1, at), mintLinkToken(ring, 1, new Date('2026-10-20T00:00:00Z')));
  assert.notEqual(mintLinkToken(ring, 1, at), mintLinkToken(ring, 2, at));
  assert.match(mintLinkToken(ring, 1, at), /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
});

test('validity: 90 days from issue-day start; future issue day rejected', () => {
  const t = mintLinkToken(ring, 1, at);
  const start = dayStart('20261019')!.getTime();
  assert.ok(verifyLinkToken(ring, t, new Date(start + TTL * 1000 - 1), TTL).ok);
  assert.deepEqual(verifyLinkToken(ring, t, new Date(start + TTL * 1000), TTL), { ok: false, reason: 'expired' });
  assert.deepEqual(verifyLinkToken(ring, t, new Date(start - 1), TTL), { ok: false, reason: 'not_yet_valid' });
});

test('tampering: payload edits, signature edits, wrong key, unknown kid, junk', () => {
  const t = mintLinkToken(ring, 1, at);
  const [p, s] = t.split('.');
  const forge = (payload: string) => `${Buffer.from(payload).toString('base64url')}.${s}`;
  assert.equal((verifyLinkToken(ring, forge('v1.k1.2.20261019'), at, TTL) as any).reason, 'bad_signature');
  assert.equal((verifyLinkToken(ring, forge('v1.k1.1.20261020'), at, TTL) as any).reason, 'bad_signature');
  const flipped = s.slice(0, -1) + (s.endsWith('A') ? 'B' : 'A');
  assert.equal((verifyLinkToken(ring, `${p}.${flipped}`, at, TTL) as any).reason, 'bad_signature');
  const other = parseLinkKeys('other-key-other-key-other-key-0123456789');
  assert.equal((verifyLinkToken(other, t, at, TTL) as any).reason, 'bad_signature');
  const k9 = Buffer.from('v1.k9.1.20261019').toString('base64url');
  const sig9 = createHmac('sha256', 'x'.repeat(40)).update('jcnews-link\n' + k9).digest('base64url');
  assert.equal((verifyLinkToken(ring, `${k9}.${sig9}`, at, TTL) as any).reason, 'unknown_kid');
  for (const junk of [undefined, '', 'abc', Buffer.from('alice@example.com').toString('base64'), t + 'x', `${p}.${s}.x`,
    forge('v1.k1.0.20261019'), forge('v1.k1.1.20261399'), forge('v2.k1.1.20261019')]) {
    assert.equal(verifyLinkToken(ring, junk, at, TTL).ok, false, String(junk));
  }
});

test('key rotation: old kid still verifies, new tokens use active kid; retired kid rejected', () => {
  const old = mintLinkToken(ring, 1, at);
  const rotated = parseLinkKeys('{"activeKid":"k2","keys":{"k1":"test-link-key-test-link-key-0123456789","k2":"second-link-key-second-link-key-0123"}}');
  assert.ok(verifyLinkToken(rotated, old, at, TTL).ok);
  const fresh = mintLinkToken(rotated, 1, at);
  assert.equal(Buffer.from(fresh.split('.')[0], 'base64url').toString(), 'v1.k2.1.20261019');
  const retired = parseLinkKeys('{"activeKid":"k2","keys":{"k2":"second-link-key-second-link-key-0123"}}');
  assert.equal((verifyLinkToken(retired, old, at, TTL) as any).reason, 'unknown_kid');
});

test('parseLinkKeys rejects short keys and bad kids; utcDay', () => {
  assert.throws(() => parseLinkKeys('short'));
  assert.throws(() => parseLinkKeys('{"activeKid":"bad kid","keys":{"bad kid":"' + 'x'.repeat(40) + '"}}'));
  assert.equal(utcDay(new Date('2026-01-02T23:00:00-05:00')), '20260103');
});
