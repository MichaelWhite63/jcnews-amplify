/**
 * Test script: calls the publishNewArticle AppSync mutation using IAM SigV4 auth.
 * Simulates what the sns-to-appsync Lambda will do in production.
 *
 * Prerequisites:
 *   AWS credentials configured locally (aws configure, or AWS_PROFILE env var)
 *   Node.js 18+
 *
 * Run:
 *   node tests/publish-article.mjs
 *   node tests/publish-article.mjs --screen oil
 *   node tests/publish-article.mjs --ticker "AAPL US"
 */

import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

// ── Config ─────────────────────────────────────────────────────────────────
const APPSYNC_URL =
  process.env.APPSYNC_URL ||
  'https://g54zkvq6ezftzlpwy4mojsbdju.appsync-api.us-east-2.amazonaws.com/graphql';
const REGION = process.env.AWS_REGION || 'us-east-2';

// ── Parse CLI args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const screen = getArg('--screen');   // e.g. oil | rates | fx | inflation | employment | trade
const ticker = getArg('--ticker');   // e.g. "AAPL US"

// Build a realistic test payload
const payload = {
  ticker:        ticker || 'AAPL US',
  headline:      `[TEST] Breaking: Market moves on Fed commentary`,
  summary:       'This is a test message sent from publish-article.mjs to verify the AppSync subscription pipeline.',
  article:       'Full article body text would appear here. Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  source:        screen ? 'Dow Jones' : 'Reuters',
  url:           ticker ? 'https://example.com/article/12345' : '',
  importance:    '2',
  category:      'MKTS',
  publishedDate: new Date().toISOString(),
  ...(screen ? { screen } : {}),
};

// ── GraphQL mutation ────────────────────────────────────────────────────────
const MUTATION = `
  mutation PublishNewArticle(
    $ticker:        String!
    $headline:      String
    $summary:       String
    $article:       String
    $source:        String
    $url:           String
    $importance:    String
    $category:      String
    $publishedDate: AWSDateTime
    $screen:        String
  ) {
    publishNewArticle(
      ticker:        $ticker
      headline:      $headline
      summary:       $summary
      article:       $article
      source:        $source
      url:           $url
      importance:    $importance
      category:      $category
      publishedDate: $publishedDate
      screen:        $screen
    ) {
      ticker
      headline
      source
      publishedDate
      screen
    }
  }
`;

// ── Sign and send ───────────────────────────────────────────────────────────
async function run() {
  console.log('\n── publishNewArticle test ──────────────────────────');
  console.log('Endpoint:', APPSYNC_URL);
  console.log('Payload: ', JSON.stringify(payload, null, 2));
  console.log('────────────────────────────────────────────────────\n');

  const body = JSON.stringify({ query: MUTATION, variables: payload });
  const url  = new URL(APPSYNC_URL);

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region:      REGION,
    service:     'appsync',
    sha256:      Sha256,
  });

  const signed = await signer.sign({
    method:   'POST',
    hostname: url.hostname,
    path:     url.pathname,
    headers: {
      'Content-Type': 'application/json',
      host:           url.hostname,
    },
    body,
  });

  const response = await fetch(APPSYNC_URL, {
    method:  'POST',
    headers: signed.headers,
    body,
  });

  const result = await response.json();

  if (result.errors) {
    console.error('AppSync errors:');
    result.errors.forEach((e) => console.error(' •', e.message));
    process.exit(1);
  }

  console.log('Success:');
  console.log(JSON.stringify(result.data?.publishNewArticle, null, 2));
}

run().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
