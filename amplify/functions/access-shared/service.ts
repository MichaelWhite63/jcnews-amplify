import type { AccessConfig } from './config';
import type { AccessRepo, PersonRow } from './repo';
import type { JwtKeys, SessionClaims } from './jwt';
import type { LinkKeyRing } from './linkToken';
import { signSession, verifySession } from './jwt';
import { mintLinkToken, verifyLinkToken } from './linkToken';
import { normalizeDepartment, parseAllowedSources } from './accessList';

/** Dependencies of exchangeToken / admin tooling. */
export interface AccessDeps {
  repo: AccessRepo;
  config: AccessConfig;
  keys: JwtKeys;
  linkKeys: LinkKeyRing;
  now?: () => Date;
  log?: (msg: string, extra?: Record<string, unknown>) => void;
}

/** The authorizer needs only the session keys: no database. */
export type AuthorizerDeps = Pick<AccessDeps, 'config' | 'keys' | 'now' | 'log'>;

const sec = (d: Date) => Math.floor(d.getTime() / 1000);
const nowOf = (d: { now?: () => Date }) => (d.now ?? (() => new Date()))();

// ───────────────────────────── mint ─────────────────────────────

export interface MintedToken { token: string; expiresAt: Date }

/** Stateless: no DB write. Same person + UTC day + kid always yields the same token. */
export function mintToken(deps: Pick<AccessDeps, 'config' | 'linkKeys' | 'now'>, personId: number, at?: Date): MintedToken {
  const now = at ?? nowOf(deps);
  const token = mintLinkToken(deps.linkKeys, personId, now);
  const dayStartMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return { token, expiresAt: new Date(dayStartMs + deps.config.tokenTtlSec * 1000) };
}

export function buildLink(baseUrl: string, token: string, ticker?: string | null): string {
  const qs = new URLSearchParams();
  if (ticker) qs.set('ticker', ticker);
  qs.set('token', token);
  return `${baseUrl.replace(/\/+$/, '')}/?${qs.toString()}`;
}

// ─────────────────────────── validation ──────────────────────────

export type TokenCheck =
  | { ok: true; person: PersonRow; issuedAt: Date; expiresAt: Date }
  | { ok: false; reason: 'malformed' | 'unknown_kid' | 'bad_signature' | 'not_yet_valid' | 'expired' | 'unknown_person' | 'revoked' };

/** Signature/date first (no I/O for junk or forgeries), then ONE persons read. */
export async function checkLinkToken(deps: AccessDeps, raw: unknown, now: Date): Promise<TokenCheck> {
  const v = verifyLinkToken(deps.linkKeys, raw, now, deps.config.tokenTtlSec);
  if (!v.ok) return v;
  const person = await deps.repo.findPersonById(v.claims.personId);
  if (!person) return { ok: false, reason: 'unknown_person' };
  if (person.tokensValidAfter && v.claims.issuedAt.getTime() < person.tokensValidAfter.getTime()) {
    return { ok: false, reason: 'revoked' };
  }
  return { ok: true, person, issuedAt: v.claims.issuedAt, expiresAt: new Date(v.claims.issuedAt.getTime() + deps.config.tokenTtlSec * 1000) };
}

// ─────────────────────────── exchange ────────────────────────────

export type ExchangeResult =
  | {
      status: 'ok';
      session: string;
      sessionExpiresAt: number;        // epoch seconds
      email: string;
      allowedSources: string[];
      department: string;
      /** Present only when rotated: the browser must replace its stored link token. */
      linkToken: string | null;
      linkTokenExpiresAt: number;      // epoch seconds of the token the browser should keep
      rotated: boolean;
    }
  | { status: 'invalid' };

export async function exchangeToken(deps: AccessDeps, rawToken: unknown): Promise<ExchangeResult> {
  const now = nowOf(deps);
  const check = await checkLinkToken(deps, rawToken, now);
  if (!check.ok) {
    deps.log?.('exchange.denied', { reason: check.reason });
    return { status: 'invalid' }; // single generic answer: no oracle
  }
  let linkToken: string | null = null;
  let linkTokenExpiresAt = check.expiresAt;
  // Silent rotation: older than rotateAfter -> today's token (also re-signs with the active kid).
  if (now.getTime() - check.issuedAt.getTime() >= deps.config.rotateAfterSec * 1000) {
    const minted = mintToken(deps, check.person.id, now);
    linkToken = minted.token;
    linkTokenExpiresAt = minted.expiresAt;
    deps.log?.('exchange.rotated', { personId: check.person.id });
  }
  const session = issueSession(deps, check.person, now);
  return {
    status: 'ok',
    session: session.jwt,
    sessionExpiresAt: session.exp,
    email: check.person.email,
    allowedSources: session.claims.src,
    department: session.claims.dep,
    linkToken,
    linkTokenExpiresAt: sec(linkTokenExpiresAt),
    rotated: linkToken !== null,
  };
}

export function issueSession(deps: Pick<AccessDeps, 'config' | 'keys'>, person: PersonRow, now: Date) {
  const iat = sec(now);
  const claims: SessionClaims = {
    iss: deps.config.jwtIssuer,
    aud: deps.config.jwtAudience,
    sub: person.email,
    pid: person.id,
    src: parseAllowedSources(person.accessList),
    dep: normalizeDepartment(person.departmentName),
    iat,
    exp: iat + deps.config.sessionTtlSec,
  };
  return { jwt: signSession(claims, deps.keys), exp: claims.exp, claims };
}

// ─────────────────────────── authorizer ──────────────────────────

export interface AuthorizerResult {
  isAuthorized: boolean;
  resolverContext?: Record<string, string>;
  ttlOverride?: number;
}

/**
 * Signature + expiry only. NO database re-check: a revoked person or changed accessList
 * takes effect when the session expires (<= sessionTtl, 10 h) — accepted trade-off.
 */
export function authorizeRequest(deps: AuthorizerDeps, authorizationToken: unknown): AuthorizerResult {
  const now = nowOf(deps);
  if (typeof authorizationToken !== 'string' || !authorizationToken) return { isAuthorized: false };
  const jwt = authorizationToken.replace(/^Bearer\s+/i, '').trim();
  const v = verifySession(jwt, deps.keys, {
    issuer: deps.config.jwtIssuer,
    audience: deps.config.jwtAudience,
    nowSec: sec(now),
    leewaySec: 0,
  });
  if (!v.ok) {
    deps.log?.('authorizer.denied', { reason: v.reason });
    return { isAuthorized: false, ttlOverride: 0 };
  }
  const c = v.claims;
  const remaining = c.exp - sec(now);
  const allowedSources = c.src.filter((s) => typeof s === 'string');
  return {
    isAuthorized: true,
    // AppSync resolverContext supports flat string values only.
    resolverContext: {
      email: c.sub,
      personId: String(c.pid),
      allowedSources: JSON.stringify(allowedSources),
      department: normalizeDepartment(c.dep),
    },
    ttlOverride: Math.max(0, Math.min(deps.config.authorizerCacheTtlSec, remaining)),
  };
}

// ─────────────────────────── revocation ──────────────────────────

/**
 * Revoke every link token of a person issued before `at` (default now). Because tokens carry
 * only an issue DAY, revoking "now" also kills today's token; fresh links work from the next
 * UTC day. keepToday=true sets the cut-off to today's 00:00Z (older links die, today's survive).
 * Live sessions keep working until they expire (<= 10 h).
 */
export async function revokePersonLinks(deps: AccessDeps, personId: number, opts: { keepToday?: boolean } = {}) {
  const now = nowOf(deps);
  const at = opts.keepToday ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) : now;
  const n = await deps.repo.setTokensValidAfter(personId, at);
  return { updated: n, validAfter: at };
}
