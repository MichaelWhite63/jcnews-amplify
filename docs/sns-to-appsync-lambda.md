# Build Spec: SNS → AppSync Lambda (`sns-to-appsync`)

## Goal

Create a new Lambda function that subscribes to the SNS topic `receiveNewsWithSummary`,
parses the incoming news article payload, and calls an AppSync mutation so that connected
UI clients receive the article in real time via a GraphQL subscription — with no polling
and no additional MySQL read.

---

## Architecture

```
RSS Collector Lambda
  → INSERT into MySQL           (persistence — unchanged)
  → PUBLISH to SNS receiveNewsWithSummary

sns-to-appsync Lambda (NEW)
  ← triggered by SNS
  → POST signed mutation to AppSync
      → onNewArticle subscription fires on all connected clients
          → App.tsx prepends article to table without re-querying
```

---

## Files to Create

### `amplify/functions/sns-to-appsync/resource.ts`

```typescript
import { defineFunction } from '@aws-amplify/backend';

export const snsToAppSync = defineFunction({
  name: 'snsToAppSync',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 256,
});
```

### `amplify/functions/sns-to-appsync/handler.ts`

```typescript
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

const APPSYNC_URL = process.env.APPSYNC_ENDPOINT!;
const REGION = process.env.AWS_REGION || 'us-east-2';

const MUTATION = /* GraphQL */ `
  mutation PublishNewArticle(
    $id: Int
    $ticker: String!
    $headline: String
    $summary: String
    $article: String
    $source: String
    $url: String
    $importance: String
    $category: String
    $publishedDate: AWSDateTime
  ) {
    publishNewArticle(
      id: $id
      ticker: $ticker
      headline: $headline
      summary: $summary
      article: $article
      source: $source
      url: $url
      importance: $importance
      category: $category
      publishedDate: $publishedDate
    ) {
      id
      ticker
      headline
      summary
      article
      source
      url
      importance
      category
      publishedDate
    }
  }
`;

export const handler = async (event: any) => {
  for (const record of event.Records) {
    let payload: any;
    try {
      payload = JSON.parse(record.Sns.Message);
    } catch (err) {
      console.error('Failed to parse SNS message:', record.Sns.Message);
      continue;
    }

    const variables = {
      id:            payload.id            ?? null,
      ticker:        payload.ticker        ?? '',
      headline:      payload.headline      ?? payload.title ?? '',
      summary:       payload.summary       ?? '',
      article:       payload.article       ?? '',
      source:        payload.source        ?? '',
      url:           payload.url           ?? payload.articleURL ?? '',
      importance:    payload.importance    ?? '',
      category:      payload.category      ?? '',
      publishedDate: payload.publishedDate ?? payload.createdAt
                       ? new Date(payload.publishedDate ?? payload.createdAt).toISOString()
                       : new Date().toISOString(),
    };

    const body = JSON.stringify({ query: MUTATION, variables });

    const url = new URL(APPSYNC_URL);
    const request = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        host: url.hostname,
      },
      body,
    };

    const signer = new SignatureV4({
      credentials: defaultProvider(),
      region: REGION,
      service: 'appsync',
      sha256: Sha256,
    });

    const signed = await signer.sign(request);

    const response = await fetch(APPSYNC_URL, {
      method: 'POST',
      headers: signed.headers as Record<string, string>,
      body,
    });

    const result = await response.json();
    if (result.errors) {
      console.error('AppSync mutation errors:', JSON.stringify(result.errors));
    } else {
      console.log('Published to AppSync:', variables.ticker, variables.headline);
    }
  }
};
```

### `amplify/functions/sns-to-appsync/package.json`

```json
{
  "dependencies": {
    "@smithy/signature-v4": "^3.0.0",
    "@aws-crypto/sha256-js": "^5.0.0",
    "@aws-sdk/credential-provider-node": "^3.0.0"
  }
}
```

---

## Files to Modify

### `amplify/data/resource.ts`

Add a `publishNewArticle` mutation and `onNewArticle` subscription to the schema.
The mutation uses no handler (passthrough) — AppSync broadcasts the payload directly.

```typescript
// Add to schema:

publishNewArticle: a
  .mutation()
  .arguments({
    id:            a.integer(),
    ticker:        a.string().required(),
    headline:      a.string(),
    summary:       a.string(),
    article:       a.string(),
    source:        a.string(),
    url:           a.string(),
    importance:    a.string(),
    category:      a.string(),
    publishedDate: a.datetime(),
  })
  .returns(a.ref('NewsArticle'))
  .authorization((allow) => [allow.authenticated('iam')]),

onNewArticle: a
  .subscription()
  .for(a.ref('publishNewArticle'))
  .returns(a.ref('NewsArticle'))
  .authorization((allow) => [allow.authenticated('iam')]),
```

### `amplify/backend.ts`

1. Import `snsToAppSync` and the CDK SNS/IAM constructs.
2. Register the function.
3. Pass the AppSync endpoint as an environment variable.
4. Grant the Lambda `appsync:GraphQL` permission.
5. Wire up the SNS subscription.

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { newsQuery } from './functions/news-query/resource';
import { snsToAppSync } from './functions/sns-to-appsync/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';

const backend = defineBackend({
  auth,
  data,
  newsQuery,
  snsToAppSync,
});

// Existing: newsQuery Secrets Manager permission
backend.newsQuery.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['arn:aws:secretsmanager:us-east-2:585768142838:secret:in4m/rds/credentials*'],
  })
);

// New: pass AppSync endpoint to snsToAppSync Lambda
const appSyncUrl = backend.data.resources.graphqlApi.graphqlUrl;
backend.snsToAppSync.resources.lambda.addEnvironment('APPSYNC_ENDPOINT', appSyncUrl);

// New: allow Lambda to call AppSync mutations
backend.snsToAppSync.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['appsync:GraphQL'],
    resources: [`${backend.data.resources.graphqlApi.arn}/*`],
  })
);

// New: subscribe Lambda to the existing SNS topic
const newsTopic = Topic.fromTopicArn(
  backend.snsToAppSync.resources.lambda.stack,
  'receiveNewsWithSummary',
  'arn:aws:sns:us-east-2:585768142838:receiveNewsWithSummary'  // update ARN if different
);
newsTopic.addSubscription(new LambdaSubscription(backend.snsToAppSync.resources.lambda));
```

---

## Frontend: Subscribe in `src/App.tsx`

Add a `useEffect` that opens a subscription when the ticker changes and prepends new
articles to the existing list. Place it alongside the other `useEffect` hooks.

```typescript
useEffect(() => {
  if (!ticker) return;

  const sub = (client as any).subscriptions.onNewArticle().subscribe({
    next: ({ data: incoming }: { data: any }) => {
      const article = incoming?.onNewArticle;
      if (!article || article.ticker !== `${ticker} ${defaultCountryCode}`) return;

      const mapped: NewsArticle = {
        id:            article.id            ?? 0,
        ticker:        article.ticker        ?? '',
        headline:      article.headline      ?? '',
        summary:       article.summary       ?? '',
        article:       article.article       ?? '',
        publishedDate: article.publishedDate ?? new Date().toISOString(),
        source:        article.source        ?? '',
        url:           article.url           ?? '',
        importance:    article.importance    ?? '',
        category:      article.category      ?? '',
      };

      setData(prev => {
        if (!prev) return prev;
        return { ...prev, newsArticles: [mapped, ...prev.newsArticles] };
      });
    },
    error: (err: any) => console.error('Subscription error:', err),
  });

  return () => sub.unsubscribe();
}, [ticker, defaultCountryCode]);
```

---

## SNS Message Format

The `receiveNewsWithSummary` topic must publish JSON matching this shape.
Field names from the existing RSS collector (`title`, `articleURL`, `createdAt`) are
handled with fallback aliases in the Lambda handler so no changes to the collector
are required.

```json
{
  "id": 98765,
  "ticker": "AAPL US",
  "title": "Apple Reports Record Quarter",
  "summary": "Apple Inc. reported...",
  "article": "Full article text...",
  "source": "Dow Jones",
  "articleURL": "",
  "importance": "High",
  "category": "Earnings",
  "createdAt": "2026-05-15T14:30:00Z"
}
```

---

## IAM / Permissions Checklist

| Resource | Permission | Granted by |
|---|---|---|
| `sns-to-appsync` Lambda execution role | `appsync:GraphQL` on the AppSync API | `backend.ts` PolicyStatement |
| SNS topic `receiveNewsWithSummary` | Invoke `sns-to-appsync` Lambda | `LambdaSubscription` in `backend.ts` |

---

## Deployment Steps

1. Run `npm install` inside `amplify/functions/sns-to-appsync/` to install dependencies.
2. Deploy with `npx ampx sandbox` (dev) or push to `main` (production).
3. Confirm the SNS subscription is confirmed in the AWS Console (SNS → Subscriptions).
4. Test by publishing a test message to `receiveNewsWithSummary` from the SNS console
   and verifying the article appears in the UI without a page refresh.
