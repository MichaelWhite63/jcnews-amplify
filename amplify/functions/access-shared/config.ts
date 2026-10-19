/**
 * Access-token configuration. Every value can be overridden through environment
 * variables so expiry / rotation can be observed in minutes during local tests.
 *
 * Durations accept: "<n>ms" | "<n>s" | "<n>m" | "<n>h" | "<n>d" or a bare number of seconds.
 */

export interface AccessConfig {
  /** Lifetime of the signed session JWT. */
  sessionTtlSec: number;
  /** Validity of a signed link token, counted from the start of its UTC issue day. */
  tokenTtlSec: number;
  /** A link token older than this is silently replaced on exchange (fresh token for today). */
  rotateAfterSec: number;
  /** AppSync Lambda-authorizer cache TTL. */
  authorizerCacheTtlSec: number;
  /** Base URL used when building links (admin CLI): https://equity.jcnews.ai */
  appBaseUrl: string;
  jwtIssuer: string;
  jwtAudience: string;
}

const UNIT_SEC: Record<string, number> = { ms: 0.001, s: 1, m: 60, h: 3600, d: 86400 };

export function parseDuration(value: string | undefined, fallbackSec: number): number {
  if (value === undefined || value.trim() === '') return fallbackSec;
  const m = /^\s*(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)?\s*$/i.exec(value);
  if (!m) throw new Error(`Invalid duration: "${value}"`);
  const n = Number(m[1]);
  const unit = (m[2] ?? 's').toLowerCase();
  return Math.round(n * UNIT_SEC[unit]);
}


export function loadConfig(env: Record<string, string | undefined> = process.env): AccessConfig {
  const cfg: AccessConfig = {
    sessionTtlSec:         parseDuration(env.ACCESS_SESSION_TTL, 10 * 3600),
    tokenTtlSec:           parseDuration(env.ACCESS_TOKEN_TTL, 90 * 86400),
    rotateAfterSec:        parseDuration(env.ACCESS_ROTATE_AFTER, 60 * 86400),
    authorizerCacheTtlSec: parseDuration(env.ACCESS_AUTHORIZER_CACHE_TTL, 300),
    appBaseUrl:            (env.ACCESS_APP_BASE_URL || 'https://equity.jcnews.ai').replace(/\/+$/, ''),
    jwtIssuer:             env.ACCESS_JWT_ISSUER || 'jcnews-access',
    jwtAudience:           env.ACCESS_JWT_AUDIENCE || 'equity.jcnews.ai',
  };
  if (cfg.rotateAfterSec >= cfg.tokenTtlSec) {
    throw new Error('ACCESS_ROTATE_AFTER must be shorter than ACCESS_TOKEN_TTL');
  }
  if (cfg.sessionTtlSec <= 0 || cfg.tokenTtlSec <= 0) throw new Error('TTLs must be positive');
  // Link tokens carry only a UTC issue DAY, so sub-day lifetimes would be meaningless.
  if (cfg.tokenTtlSec < 86400 || cfg.rotateAfterSec < 86400) {
    throw new Error('ACCESS_TOKEN_TTL and ACCESS_ROTATE_AFTER must be at least 1d (link tokens are day-granular)');
  }
  return cfg;
}
