/**
 * Exercises the WAF rate limit (100 requests / 5 min / IP on exchangeToken) against a
 * DEPLOYED sandbox AppSync API. Uses the guest (unauthenticated Cognito identity) IAM credentials,
 * exactly like the browser. Sends bogus tokens, so it creates no data and grants no access.
 *
 *   node scripts/access/waf-limit-test.mjs [--count 150] [--outputs ../amplify_outputs.json]
 *
 * Expect: first ~100 answered by AppSync ({status:"invalid"}), then HTTP 403 from WAF.
 * Note: WAF rate-based rules are evaluated asynchronously; blocking can start a little late (up to ~1-2 min).
 */
import { readFileSync } from 'node:fs';
import { AwsClient } from 'aws4fetch';
import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } from '@aws-sdk/client-cognito-identity';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const count = Number(arg('count', 150));
const outputs = JSON.parse(readFileSync(arg('outputs', new URL('../../../amplify_outputs.json', import.meta.url)), 'utf8'));
const region = outputs.auth.aws_region;
const url = outputs.data.url;

const cog = new CognitoIdentityClient({ region });
const { IdentityId } = await cog.send(new GetIdCommand({ IdentityPoolId: outputs.auth.identity_pool_id }));
const { Credentials } = await cog.send(new GetCredentialsForIdentityCommand({ IdentityId }));
const aws = new AwsClient({
  accessKeyId: Credentials.AccessKeyId, secretAccessKey: Credentials.SecretKey,
  sessionToken: Credentials.SessionToken, service: 'appsync', region,
});

const query = 'mutation($t:String!){ exchangeToken(token:$t){ status } }';
const tally = {};
let firstBlock = null;
for (let i = 1; i <= count; i++) {
  const variables = { t: 'x'.repeat(43) };
  const body = JSON.stringify({ query, variables });
  const res = await aws.fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  const key = String(res.status);
  tally[key] = (tally[key] || 0) + 1;
  if (res.status === 403 && firstBlock === null) firstBlock = i;
  if (i % 25 === 0) console.log(`#${i}`, tally);
}
console.log('\nFinal tally:', tally, firstBlock ? `first 403 at request #${firstBlock}` : 'NO blocks observed');
console.log(tally['403'] ? 'WAF rate limit is active.' : 'No 403s: raise --count, wait 1-2 min and retry, or check the web ACL association / ACCESS_WAF=off.');
