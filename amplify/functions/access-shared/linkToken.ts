/**
 * Stateless signed link tokens (no database row).
 *
 * SHARED CONTRACT — this file is vendored byte-for-byte into the Apollo subscriptionServer
 * (src/access/linkToken.ts). Change both copies together; the golden-vector tests in both
 * repos pin the format.
 *
 *   payload   = "v1.<kid>.<personId>.<YYYYMMDD>"          (issue day, UTC)
 *   token     = base64url(payload) + "." + base64url(HMAC-SHA256(key[kid], "jcnews-link\n" + base64url(payload)))
 *
 * Deterministic: the same person/day/kid always yields the same token, on every instance.
 * Validity is 90 days from the start of the issue day (checked by the verifier, not encoded).
 * Revocation is persons.tokens_valid_after (checked by exchangeToken).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface LinkKeyRing { activeKid: string; keys: Record<string, string> }

export interface LinkTokenClaims { kid: string; personId: number; issuedDay: string /* YYYYMMDD */; issuedAt: Date }

const KID_RE = /^[A-Za-z0-9_-]{1,16}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{10,80}\.[A-Za-z0-9_-]{43}$/;
const PAYLOAD_RE = /^v1\.([A-Za-z0-9_-]{1,16})\.([1-9][0-9]{0,14})\.([0-9]{8})$/;
const DOMAIN = 'jcnews-link\n';

/** Accepts a plain secret, {"secret":"..."} or {"activeKid":"k2","keys":{"k1":"...","k2":"..."}}. Keys must be >= 32 bytes. */
export function parseLinkKeys(raw: string): LinkKeyRing {
  const t = raw.trim();
  let ring: LinkKeyRing;
  if (t.startsWith('{')) {
    const p = JSON.parse(t);
    if (p.keys && p.activeKid && typeof p.keys[p.activeKid] === 'string') ring = { activeKid: p.activeKid, keys: p.keys };
    else if (typeof p.secret === 'string') ring = { activeKid: 'k1', keys: { k1: p.secret } };
    else throw new Error('link key JSON must be {"activeKid","keys"} or {"secret"}');
  } else ring = { activeKid: 'k1', keys: { k1: t } };
  for (const [kid, key] of Object.entries(ring.keys)) {
    if (!KID_RE.test(kid)) throw new Error('invalid link key id');
    if (typeof key !== 'string' || Buffer.byteLength(key) < 32) throw new Error('link keys must be at least 32 bytes');
  }
  return ring;
}

export function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

export function dayStart(day: string): Date | null {
  const d = new Date(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || utcDay(d) !== day ? null : d;
}

function sign(key: string, payloadB64: string): string {
  return createHmac('sha256', key).update(DOMAIN + payloadB64, 'utf8').digest('base64url');
}

export function mintLinkToken(ring: LinkKeyRing, personId: number, now: Date): string {
  if (!Number.isSafeInteger(personId) || personId <= 0) throw new Error('invalid person id');
  const payloadB64 = Buffer.from(`v1.${ring.activeKid}.${personId}.${utcDay(now)}`, 'utf8').toString('base64url');
  return `${payloadB64}.${sign(ring.keys[ring.activeKid], payloadB64)}`;
}

export type LinkVerify =
  | { ok: true; claims: LinkTokenClaims }
  | { ok: false; reason: 'malformed' | 'unknown_kid' | 'bad_signature' | 'not_yet_valid' | 'expired' };

/** Signature + date checks only (constant-time compare). Revocation is the caller's job. */
export function verifyLinkToken(ring: LinkKeyRing, token: unknown, now: Date, ttlSec: number): LinkVerify {
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return { ok: false, reason: 'malformed' };
  const [payloadB64, sig] = token.split('.');
  const m = PAYLOAD_RE.exec(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  // Re-encode check rejects non-canonical base64url variants of the same payload.
  if (!m || Buffer.from(m[0], 'utf8').toString('base64url') !== payloadB64) return { ok: false, reason: 'malformed' };
  const key = ring.keys[m[1]];
  if (!key) return { ok: false, reason: 'unknown_kid' };
  const a = Buffer.from(sign(key, payloadB64)), b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad_signature' };
  const issuedAt = dayStart(m[3]);
  const personId = Number(m[2]);
  if (!issuedAt || !Number.isSafeInteger(personId)) return { ok: false, reason: 'malformed' };
  if (issuedAt.getTime() > now.getTime()) return { ok: false, reason: 'not_yet_valid' };
  if (now.getTime() >= issuedAt.getTime() + ttlSec * 1000) return { ok: false, reason: 'expired' };
  return { ok: true, claims: { kid: m[1], personId, issuedDay: m[3], issuedAt } };
}
