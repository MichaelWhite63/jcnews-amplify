import { createHmac } from 'node:crypto';
import { safeEqual } from './tokens';

/**
 * Minimal HS256 JWT (no dependency). Supports key rotation through `kid`:
 * signing uses the active key, verification accepts any configured key.
 */
export interface JwtKeys {
  activeKid: string;
  keys: Record<string, string>;
}

export interface SessionClaims {
  iss: string;
  aud: string;
  sub: string;       // email
  pid: number;       // persons.id
  src: string[];     // allowedSources at exchange time (authorizer trusts this; no DB re-check)
  dep: string;       // department (equity|options)
  iat: number;
  exp: number;
}

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');

/** Accepts a plain secret string, or JSON {"activeKid":"k2","keys":{"k1":"...","k2":"..."}}. */
export function parseJwtKeys(raw: string): JwtKeys {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    if (parsed.keys && parsed.activeKid && parsed.keys[parsed.activeKid]) return parsed as JwtKeys;
    if (typeof parsed.secret === 'string') return { activeKid: 'default', keys: { default: parsed.secret } };
    throw new Error('JWT secret JSON must be {"activeKid","keys"} or {"secret"}');
  }
  return { activeKid: 'default', keys: { default: trimmed } };
}

function assertStrong(secret: string) {
  if (Buffer.byteLength(secret) < 32) throw new Error('JWT secret must be at least 32 bytes');
}

export function signSession(claims: SessionClaims, keys: JwtKeys): string {
  const secret = keys.keys[keys.activeKid];
  assertStrong(secret);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: keys.activeKid }));
  const payload = b64url(JSON.stringify(claims));
  const sig = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export type VerifyResult =
  | { ok: true; claims: SessionClaims }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' | 'wrong_audience' | 'not_yet_valid' };

export function verifySession(
  token: string,
  keys: JwtKeys,
  opts: { issuer: string; audience: string; nowSec?: number; leewaySec?: number },
): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  let header: any;
  let claims: any;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  // Pin the algorithm: never trust header.alg beyond checking it is HS256.
  if (header?.alg !== 'HS256' || header?.typ !== 'JWT') return { ok: false, reason: 'malformed' };
  const secret = keys.keys[header.kid ?? 'default'];
  if (!secret) return { ok: false, reason: 'bad_signature' };
  const expected = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
  if (!safeEqual(expected, parts[2])) return { ok: false, reason: 'bad_signature' };

  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  const leeway = opts.leewaySec ?? 30;
  if (claims.iss !== opts.issuer || claims.aud !== opts.audience) return { ok: false, reason: 'wrong_audience' };
  if (typeof claims.exp !== 'number' || now >= claims.exp + leeway) return { ok: false, reason: 'expired' };
  if (typeof claims.iat === 'number' && claims.iat > now + leeway) return { ok: false, reason: 'not_yet_valid' };
  if (typeof claims.sub !== 'string' || typeof claims.pid !== 'number' || !Array.isArray(claims.src)) {
    return { ok: false, reason: 'malformed' };
  }
  return { ok: true, claims: claims as SessionClaims };
}
