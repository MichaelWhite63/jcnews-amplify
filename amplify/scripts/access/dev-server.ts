/**
 * LOCAL ONLY: tiny HTTP stand-in for the exchangeToken AppSync mutation,
 * backed by the docker-compose MySQL. Lets you test the browser flow (first visit, new tab,
 * renewal, rotation, expiry, revocation, sign-out) without deploying anything.
 *
 *   set -a; source local-dev/access.env; set +a
 *   (cd amplify && npx tsx scripts/access/dev-server.ts)          # listens on :8787
 *   VITE_ACCESS_DEV_API=http://localhost:8787 VITE_ACCESS_DATA_AUTH=iam npm run dev
 *
 * VITE_ACCESS_DATA_AUTH=iam makes the dev UI read data with the legacy guest mode (the deployed
 * API has no authorizer that trusts this local JWT secret). Both flags only work under `vite dev`.
 */
import { createServer } from 'node:http';
import { getAccessDeps } from '../../functions/access-shared/runtime';
import { exchangeToken } from '../../functions/access-shared/service';

const PORT = Number(process.env.ACCESS_DEV_PORT || 8787);
const ORIGIN = process.env.ACCESS_DEV_ORIGIN || 'http://localhost:5173';

const deps = await getAccessDeps();
console.log(`[access-dev] durations: session=${deps.config.sessionTtlSec}s token=${deps.config.tokenTtlSec}s ` +
  `rotateAfter=${deps.config.rotateAfterSec}s (link tokens are day-granular: use access-admin mint --issued to test rotation/expiry)`);

createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  if (req.method !== 'POST') { res.writeHead(405).end(); return; }
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 10_000) { res.writeHead(413).end(); return; } }
  try {
    const input = JSON.parse(body || '{}');
    let out: unknown;
    if (req.url === '/exchangeToken') out = await exchangeToken(deps, input.token);
    else { res.writeHead(404).end(); return; }
    console.log(`[access-dev] ${req.url} -> ${JSON.stringify(out, (k, v) => (k === 'session' || k === 'linkToken') && v ? `${String(v).slice(0, 8)}…` : v)}`);
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out));
  } catch (e) {
    console.error('[access-dev] error', e);
    res.writeHead(500).end();
  }
}).listen(PORT, '127.0.0.1', () => console.log(`[access-dev] listening on http://127.0.0.1:${PORT} (CORS: ${ORIGIN})`));
