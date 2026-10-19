/**
 * Environment passed to the access Lambdas. Values are read from the shell / Amplify
 * console env at *deploy* time, so `ACCESS_SESSION_TTL=5m npx ampx sandbox` gives a
 * sandbox with short durations. Unset values fall back to production defaults in config.ts.
 */
const KEYS = [
  'ACCESS_SESSION_TTL', 'ACCESS_TOKEN_TTL', 'ACCESS_ROTATE_AFTER',
  'ACCESS_AUTHORIZER_CACHE_TTL', 'ACCESS_APP_BASE_URL',
  'ACCESS_DB_SECRET_NAME', 'ACCESS_JWT_SECRET_NAME', 'ACCESS_LINK_SECRET_NAME',
] as const;

export function accessFunctionEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const k of KEYS) {
    const v = process.env[k];
    if (v !== undefined && v !== '') env[k] = v;
  }
  return env;
}
