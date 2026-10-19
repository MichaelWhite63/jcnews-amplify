/**
 * Lambda/CLI runtime wiring: loads DB credentials + JWT keys (Secrets Manager in AWS,
 * plain env vars for local testing), builds a pooled MySQL repo.
 * Everything is cached per container so warm invocations do no extra I/O.
 */
import mysql from 'mysql2/promise';
import { loadConfig } from './config';
import { parseJwtKeys, type JwtKeys } from './jwt';
import { MysqlAccessRepo } from './mysqlRepo';
import { parseLinkKeys, type LinkKeyRing } from './linkToken';
import type { AccessDeps, AuthorizerDeps } from './service';

interface DbCreds { host: string; port: number; user: string; password: string; database: string }

const cache = new Map<string, string>();
async function getSecret(name: string): Promise<string> {
  if (cache.has(name)) return cache.get(name)!;
  const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
  const client = new SecretsManagerClient({ region: process.env.ACCESS_SECRETS_REGION || 'us-east-2' });
  const res = await client.send(new GetSecretValueCommand({ SecretId: name }));
  if (!res.SecretString) throw new Error(`Secret ${name} has no SecretString`);
  cache.set(name, res.SecretString);
  return res.SecretString;
}

async function loadDbCreds(env = process.env): Promise<DbCreds> {
  // Local testing: explicit env vars win (docker-compose MySQL).
  if (env.ACCESS_DB_HOST) {
    return {
      host: env.ACCESS_DB_HOST,
      port: Number(env.ACCESS_DB_PORT || 3306),
      user: env.ACCESS_DB_USER || 'root',
      password: env.ACCESS_DB_PASSWORD || '',
      database: env.ACCESS_DB_NAME || 'in4mdatabase',
    };
  }
  const s = JSON.parse(await getSecret(env.ACCESS_DB_SECRET_NAME || 'in4m/rds/credentials'));
  return { host: s.host, port: Number(s.port || 3306), user: s.username, password: s.password, database: s.dbname };
}

async function loadJwtKeys(env = process.env): Promise<JwtKeys> {
  if (env.ACCESS_JWT_SECRET) return parseJwtKeys(env.ACCESS_JWT_SECRET); // local only
  return parseJwtKeys(await getSecret(env.ACCESS_JWT_SECRET_NAME || 'jcnews/access/jwt'));
}

async function loadLinkKeys(env = process.env): Promise<LinkKeyRing> {
  if (env.ACCESS_LINK_SECRET) return parseLinkKeys(env.ACCESS_LINK_SECRET); // local only
  return parseLinkKeys(await getSecret(env.ACCESS_LINK_SECRET_NAME || 'jcnews/access/link-hmac'));
}

export async function createAccessPool(creds: DbCreds) {
  return mysql.createPool({
    ...creds,
    timezone: 'Z',
    connectionLimit: 2,
    connectTimeout: 10000,
    enableKeepAlive: true,
  });
}

let depsPromise: Promise<AccessDeps & { close(): Promise<void> }> | null = null;

export function getAccessDeps(): Promise<AccessDeps & { close(): Promise<void> }> {
  if (!depsPromise) {
    depsPromise = (async () => {
      const config = loadConfig();
      const [creds, keys, linkKeys] = await Promise.all([loadDbCreds(), loadJwtKeys(), loadLinkKeys()]);
      const pool = await createAccessPool(creds);
      const log = (msg: string, extra?: Record<string, unknown>) => console.log(JSON.stringify({ msg, ...extra }));
      return { repo: new MysqlAccessRepo(pool), config, keys, linkKeys, log, close: () => pool.end() };
    })().catch((e) => { depsPromise = null; throw e; });
  }
  return depsPromise;
}

let authorizerDeps: Promise<AuthorizerDeps> | null = null;

/** Authorizer: session keys only (no DB credentials, no pool, no link key). */
export function getAuthorizerDeps(): Promise<AuthorizerDeps> {
  if (!authorizerDeps) {
    authorizerDeps = (async () => {
      const config = loadConfig();
      const keys = await loadJwtKeys();
      const log = (msg: string, extra?: Record<string, unknown>) => console.log(JSON.stringify({ msg, ...extra }));
      return { config, keys, log };
    })().catch((e) => { authorizerDeps = null; throw e; });
  }
  return authorizerDeps;
}
