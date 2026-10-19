# Local testing on the Mac — browser access (phase 1)

Everything here runs from `~/Documents/jcnews/Amplify`. Nothing in the steps deploys to production.

| Level | What you test | Needs AWS? |
|---|---|---|
| 1. Unit tests | Signed link tokens (golden vector, tampering, kid rotation), rotation, revocation, JWT, authorizer (no DB), throttle, browser session logic | No |
| 2. Integration tests | The same against real MySQL 8 (docker) | No |
| 3. Local UI | Real React UI + local exchange server + docker MySQL, with expiry and rotation in minutes | Reads news from production AppSync as guest, exactly like today |
| 4. Sandbox | The real Lambdas, Lambda authorizer and WAF in a personal Amplify sandbox | Yes (your `JCNews` profile) |

## 0. Get the branch

The patch was made against `main` at `714ed80` (your current HEAD).

```bash
cd ~/Documents/jcnews/Amplify
git status                                   # should be clean
git checkout -b feature/ui-token-access
git am /path/to/0001-feature-ui-token-access.patch   # or: git apply --index <patch> && git commit
npm ci
(cd amplify && npm ci)
```

Prerequisites: Node 20+ and Docker Desktop. For level 4 you also need AWS CLI access with the `JCNews` profile.

## 1. Unit tests (about 2 s)

```bash
npm run test:access        # browser session logic + backend core (node:test via tsx)
```

## 2. MySQL 8 in Docker + integration tests

```bash
docker compose -f local-dev/docker-compose.yml up -d      # MySQL 8 on localhost:3307, seeded with fake people
cp local-dev/access.env.example local-dev/access.env
# Put real random values into ACCESS_JWT_SECRET and the k1 key of ACCESS_LINK_SECRET (keep the single quotes):
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
set -a; source local-dev/access.env; set +a

ACCESS_TEST_DB=1 npm --prefix amplify run test:access:db  # unit + integration tests
```

The seed is in `local-dev/seed/`: a subset of `persons` / `departments`, the new `persons.tokens_valid_after` column, and three fake `@example.com` people:

- `alice.equity@example.com` (Unlicensed + DowJones)
- `oscar.options@example.com` (Options; Unlicensed only)
- `nora.nosources@example.com` (no sources, so she sees no articles: default deny)

To try your own address, add a row to `persons` in the container:

```bash
docker exec -it jcnews-access-mysql mysql -uroot -plocaldev-root-pw in4mdatabase
```

## 3. Local UI with short durations

`local-dev/access.env` sets a 3-min session. Link tokens are day-granular, so rotation and expiry are tested with **backdated** tokens (`mint --issued`) rather than short TTLs.

Terminal A, the local exchange server (a stand-in for the `exchangeToken` mutation):

```bash
set -a; source local-dev/access.env; set +a
cd amplify && npx tsx scripts/access/dev-server.ts          # http://127.0.0.1:8787
```

Terminal B, the UI:

```bash
VITE_ACCESS_DEV_API=http://localhost:8787 VITE_ACCESS_DATA_AUTH=iam npm run dev   # http://localhost:5173
```

Both `VITE_` flags only take effect under `vite dev`; production builds ignore them. With `VITE_ACCESS_DATA_AUTH=iam`, news is read with the legacy guest mode, because the deployed API can't validate locally signed sessions.

Terminal C, mint a test link (it prints a `http://localhost:5173/?ticker=…&token=…` URL):

```bash
set -a; source local-dev/access.env; set +a
cd amplify && npx tsx scripts/access/access-admin.ts mint --email alice.equity@example.com --ticker "AAPL US"
```

Walk through the flows. In DevTools, watch Application → Local Storage → `jcnews.access.v1`.

| Flow | How | Expected |
|---|---|---|
| First visit | Open the minted link | The address bar loses `token=` (keeps `ticker`), the UI loads, the header shows `alice.equity@example.com` + **Sign out** |
| New tab | Open `http://localhost:5173/?ticker=MSFT%20US` in a new tab | Loads straight away, with no call in terminal A |
| Renewal | Leave the tab open for more than 1 minute | About 2 min before the 3-min session expires, terminal A logs an `/exchangeToken`; `session` in storage changes |
| Rotation | Mint with `--issued` 61 days ago (e.g. `--issued $(date -u -v-61d +%F)` on macOS) and open it | Terminal A shows `rotated:true`; `linkToken` in storage changes to today's token |
| Expiry | Mint with `--issued` 91 days ago and open it in a private window | **"This link is no longer valid"** + "reopen the ticker from your vendor application" |
| Tampered | Change one character of the token in a minted link | Same screen; terminal A logs `invalid` (no DB query) |
| Revocation | `npx tsx scripts/access/access-admin.ts revoke --email alice.equity@example.com`, then wait for the next renewal (or clear the session in storage and reload) | Reopen-from-vendor screen. Today's link is dead too; `revoke --keep-today` kills only older links. In AWS, existing sessions keep working until they expire (≤ 10 h; no DB check in the authorizer) |
| Legacy link | `http://localhost:5173/?ticker=AAPL%20US&email=user%40example.com` | "This link format is no longer supported" + reopen-from-vendor text, `email=` removed from the URL, no exchange call |
| Sign out | Click **Sign out** in one tab | All tabs show the reopen-from-vendor screen; watchlist and history keys are cleared |
| No sources | Mint for `nora.nosources@example.com` | The UI loads but the news tables stay empty |

Inspect a person's revocation and throttle state:

```bash
npx tsx scripts/access/access-admin.ts status --email alice.equity@example.com
```

Clear a revocation locally: `UPDATE persons SET tokens_valid_after = NULL WHERE email = 'alice.equity@example.com';`

Apollo side (subscriptionServer, after applying its patch), against the same docker MySQL with the **same** `ACCESS_LINK_SECRET`:

```bash
ACCESS_TEST_DB=1 AMPLIFY_REPO=~/Documents/jcnews/Amplify ACCESS_DB_HOST=127.0.0.1 ACCESS_DB_PORT=3307 \
  ACCESS_DB_USER=root ACCESS_DB_PASSWORD=localdev-root-pw npm run test:access   # in subscriptionServer
```

## 4. Amplify sandbox (real Lambdas + authorizer + WAF)

A sandbox is a separate copy of the backend (its own AppSync API and Cognito) in your AWS account. Production is not touched.

The sandbox Lambdas run in AWS, so they **can't reach the docker MySQL**. Use a scratch database on the existing RDS instance. **Don't point sandboxes at production `in4mdatabase` tables.**

1. Create a scratch DB using the docker seed. Use your real RDS admin password; the one in `.env` is out of date.
   ```bash
   mysql -h production-in4m-database.cnwkqkqik0k9.us-east-2.rds.amazonaws.com -u admin -p \
     -e "CREATE DATABASE jcnews_access_sandbox"
   for f in local-dev/seed/00_schema_subset.sql local-dev/seed/10_persons_tokens_valid_after.sql local-dev/seed/20_fake_people.sql; do
     sed 's/in4mdatabase/jcnews_access_sandbox/g' "$f" | mysql -h production-in4m-database.cnwkqkqik0k9.us-east-2.rds.amazonaws.com -u admin -p
   done
   ```

2. Create three sandbox secrets:
   ```bash
   aws secretsmanager create-secret --profile JCNews --region us-east-2 --name jcnews/access/sandbox-db \
     --secret-string '{"host":"production-in4m-database.cnwkqkqik0k9.us-east-2.rds.amazonaws.com","port":3306,"username":"admin","password":"<REAL PASSWORD>","dbname":"jcnews_access_sandbox"}'
   aws secretsmanager create-secret --profile JCNews --region us-east-2 --name jcnews/access/jwt-sandbox \
     --secret-string "$(openssl rand -base64 48)"
   aws secretsmanager create-secret --profile JCNews --region us-east-2 --name jcnews/access/link-hmac-sandbox \
     --secret-string "{\"activeKid\":\"k1\",\"keys\":{\"k1\":\"$(openssl rand -base64 48)\"}}"
   ```
   A dedicated least-privilege DB user for the sandbox is better than `admin`.

3. Start the sandbox with short durations. The values are baked into the Lambda environment at deploy time.
   ```bash
   ACCESS_DB_SECRET_NAME=jcnews/access/sandbox-db ACCESS_JWT_SECRET_NAME=jcnews/access/jwt-sandbox \
   ACCESS_LINK_SECRET_NAME=jcnews/access/link-hmac-sandbox ACCESS_SESSION_TTL=5m \
   ACCESS_AUTHORIZER_CACHE_TTL=30 ACCESS_APP_BASE_URL=http://localhost:5173 \
   ACCESS_WAF=on \
   npx ampx sandbox --profile JCNews
   ```
   This rewrites `amplify_outputs.json` to point at the sandbox.

4. In another terminal, run the UI against the sandbox with no `VITE_` flags, so it uses the real `exchangeToken` and authorizer:
   ```bash
   npm run dev
   ```

5. Mint a link in the sandbox DB. Without `ACCESS_DB_HOST`, the script reads Secrets Manager with your AWS credentials:
   ```bash
   cd amplify
   AWS_PROFILE=JCNews ACCESS_DB_SECRET_NAME=jcnews/access/sandbox-db ACCESS_JWT_SECRET_NAME=jcnews/access/jwt-sandbox \
     ACCESS_LINK_SECRET_NAME=jcnews/access/link-hmac-sandbox \
     npx tsx scripts/access/access-admin.ts mint --email alice.equity@example.com --ticker "AAPL US" --base-url http://localhost:5173
   ```
   Open the link and repeat the table from level 3. In DevTools → Network, data calls should carry an `Authorization: eyJ…` header (Lambda auth) instead of SigV4. CloudWatch logs for `accessAuthorizer` / `accessExchange` show the decisions (no token values).

6. Check revocation: revoke, then reopen the link in a private window. The exchange fails at once. The already signed-in tab keeps working until its 5-min session expires; the authorizer has no DB check by design.

7. Test the WAF limit. It sends bogus tokens with guest credentials, like the browser does:
   ```bash
   node amplify/scripts/access/waf-limit-test.mjs --count 160                 # exchangeToken (the only rate-limited op)
   ```
   Expect about 100 responses with HTTP 200 (`status: invalid`), then HTTP 403 from WAF. WAF rate rules react with a delay of up to 1–2 min, so run with a higher `--count` if no 403s appear. The block lifts a few minutes after traffic stops. Normal data queries from the same IP are **not** blocked.

8. Check the publisher still works (phase 1 must not break it):
   ```bash
   APPSYNC_URL=$(node -e "console.log(require('./amplify_outputs.json').data.url)") AWS_PROFILE=JCNews \
     node tests/publish-article.mjs --ticker "AAPL US"
   ```
   The article should appear live in the signed-in sandbox UI.

9. Clean up:
   ```bash
   # Ctrl-C the sandbox, then:
   npx ampx sandbox delete --profile JCNews
   git checkout amplify_outputs.json          # never commit sandbox outputs (CLAUDE.md)
   ```

## Troubleshooting

- **`invalid` for every token in the sandbox**: the Lambda can't read a secret (check the names passed at deploy), the link key differs from the one used to mint, or the DB is unreachable (RDS security group).
- **`Unauthorized` on data calls after loading**: the JWT secret name differs between `accessExchange` and `accessAuthorizer`, or the browser clock is far off.
- **No 403s from WAF**: `ACCESS_WAF=off` was set, or another web ACL is already attached to the API (only one is allowed).
- **`Access denied` with `.env` credentials**: the `SQL_PASSWORD` in `.env` is out of date.
