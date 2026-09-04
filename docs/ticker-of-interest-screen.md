# Build Spec: Ticker-of-Interest Live Screen

## ⚠️ SANDBOX ONLY — READ BEFORE STARTING

**Everything in this document must be built and verified in an Amplify sandbox
(`npm run sandbox`, which runs `npx ampx sandbox --dir-to-watch amplify`), never in production.**

- Production deploys ONLY via `amplify.yml`'s `npx ampx pipeline-deploy`, which Amplify Hosting
  triggers automatically on a push to whatever branch is connected to the hosted app (confirmed
  in this repo's `amplify.yml`). There is no separate manual "deploy to prod" step to avoid —
  the risk is specifically **pushing to that connected branch** (commonly `main`) before this is
  tested.
- Do this work on a separate git branch, not the branch connected to Amplify Hosting. Do not
  merge or push to that branch as part of implementing this spec.
- `npx ampx sandbox` provisions a completely separate, personal set of AWS resources (its own
  AppSync API, its own backend) tied to your own AWS profile — it does not touch the production
  AppSync API, and changes there are invisible to real users. This is the correct and only place
  to verify this feature end to end.
- This is intentionally a two-part change (schema + new screen) that reaches real user-facing
  behavior (a live-updating feed) — per instruction, it needs considerable testing in the sandbox
  before anyone should consider pushing it toward production. Nothing in this document should be
  read as authorization to do that push; that's a separate, later decision.

If whatever tool or person is executing this spec is only able to run commands in a context that
deploys straight to production (no sandbox available), stop and flag that rather than proceeding.

---

## Goal

Two things, both scoped to this repo only (the companion piece — a new SNS topic, and a
standalone Lambda that calls the mutation this document adds — already exists outside this repo,
in the subscriptionServer project's `AWS_Lambda/readSNSTickersOfInterestThenWriteToAmplify`):

1. A new mutation/subscription pair, `notifyTickerOfInterest` / `onTickerOfInterest`, filtered by
   `email`, so a specific user's already-open browser tab (and only that tab) gets notified when
   that same user expresses interest in a new ticker elsewhere in the system.
2. A new screen showing a live, scrolling feed of news for every ticker in that user's interest
   list for the current session — growing as new tickers are added, updating as new articles
   arrive, no page refresh.

## Why a new mutation/subscription pair instead of reusing `publishNewArticle`/`onNewArticle`

The existing `publishNewArticle`/`onNewArticle` pair is a broadcast: every connected client
receives every published article, and `App.tsx` filters client-side by ticker. That's the right
shape for article content, which is genuinely relevant to anyone watching that ticker. It is the
wrong shape for "this user just expressed interest in this ticker" — that fact is only ever
relevant to that one user, not everyone, and `onNewArticle` must stay unfiltered so it keeps
broadcasting article content correctly to every existing subscriber. Adding a required filter to
it would change that behavior for everyone, not just this new feature.

## Architecture

```
(outside this repo — subscriptionServer)
  initialRelevance/initialRelevances(symbol, email)
    → publish {email, symbol} to SNS sendTickerFromApolloServerToAmplify
        (only once per ticker per day, per that project's design)

(outside this repo — AWS_Lambda/readSNSTickersOfInterestThenWriteToAmplify, already built)
  ← triggered by that SNS topic
  → signed POST to THIS Amplify app's AppSync endpoint:
      mutation notifyTickerOfInterest(email, ticker)

(this repo — what this document builds)
  onTickerOfInterest(email: $email) fires only for the subscriber(s) using that email
    → new Interest List screen adds the ticker to its local list
  onNewArticle() [existing, unfiltered] → if article.ticker is in that local list,
    the same screen prepends it to its scrolling feed
```

The new Lambda cannot successfully call `notifyTickerOfInterest` until the schema change below
is deployed (to the sandbox first). That's expected and fine — it's a separate project with its
own deployment, not something this document needs to sequence.

## Important product decision already made, carried over from design discussion

The interest list is **per-session, not persisted**. The new screen starts empty on load and is
built up purely from live `onTickerOfInterest` events for the rest of that tab's lifetime — there
is deliberately no query that backfills "what was I interested in earlier today." Do not add one;
it was considered and explicitly rejected (see subscriptionServer's `TICKER_OF_INTEREST_DESIGN.md`
if you want the full reasoning). This matters for implementation: the new screen needs no data
source on mount, only two live subscriptions.

---

## Part 1 — Schema change

### File: `amplify/data/resource.ts`

Add a new custom type and a new mutation/subscription pair. Model placement: alongside the
existing `NewsArticle`/`publishNewArticle`/`onNewArticle` block, since it's the same category of
"push something live to connected clients" operation.

```typescript
TickerInterest: a.customType({
  email:  a.string(),
  ticker: a.string(),
}),

notifyTickerOfInterest: a
  .mutation()
  .arguments({
    email:  a.string().required(),
    ticker: a.string().required(),
  })
  .returns(a.ref('TickerInterest'))
  .authorization((allow) => [allow.authenticated('iam')]),

onTickerOfInterest: a
  .subscription()
  .for(a.ref('notifyTickerOfInterest'))
  .arguments({ email: a.string() })
  .returns(a.ref('TickerInterest'))
  .authorization((allow) => [allow.authenticated('iam')]),
```

**Two things to verify empirically in the sandbox, not assumed here:**

1. **Authorization mode.** This spec deliberately uses `allow.authenticated('iam')`, not
   `allow.guest()` — this mutation should only ever be callable by the backend Lambda's own IAM
   role (via a SigV4-signed request), never by the browser app's guest identity. That's a
   different choice than the currently-deployed `publishNewArticle`, which uses `allow.guest()`.
   Confirm in the sandbox that a request signed with an arbitrary IAM role (not the Cognito
   guest/unauthenticated role) is actually accepted once that role is granted `appsync:GraphQL`
   on the API — Amplify Gen 2's exact interaction between this field-level annotation and a
   separately IAM-policy-granted external caller is worth confirming rather than trusting this
   document, since the existing `publishNewArticle` may have used `allow.guest()` for exactly
   this reason if `allow.authenticated('iam')` didn't behave as expected there.
2. **Subscription filter argument.** `.arguments({ email: a.string() })` on the subscription is
   meant to use AppSync's built-in subscription filtering — the subscriber's `email` argument is
   matched against the `email` field of whatever `notifyTickerOfInterest` returns, so only a
   matching subscriber receives it. Confirm this actually compiles and behaves as a filter against
   the `@aws-amplify/backend` version installed in this repo. If it doesn't, the fallback is the
   same one `App.tsx` already uses for ticker/screen matching today: subscribe unfiltered and
   compare `payload.email === userEmail` client-side before acting on it. Either way, do not ship
   this without confirming real filtering is happening — an unfiltered fallback still works
   correctly, but only if the client-side check is actually added; don't skip it.

After editing this file, `npx ampx sandbox` should pick up the change and regenerate the client
types used by `generateClient<Schema>()` in `App.tsx` automatically.

---

## Part 2 — New screen in `src/App.tsx`

### 2.1 Extend the view union

```typescript
const [activeView, setActiveView] = useState<'db' | 'oil_news' | 'rates_news' | 'fx_news' | 'inflation_news' | 'employment_news' | 'trade_news' | 'interest_list'>('db')
```

### 2.2 New state and a ref (stale-closure safe, same pattern as `activeScreenKeyRef`)

Subscription callbacks close over state from the render they were created in. `App.tsx` already
solves this for the currently-active ticker via `activeScreenKeyRef` (kept in sync with
`activeView`/`searchTicker` via a `useEffect`). The interest-list ticker set needs the same
treatment, since the `onNewArticle` handler (added in 2.4) needs to read the *current* list, not
whatever it was when the subscription was first opened.

```typescript
const [interestTickers, setInterestTickers] = useState<string[]>([])
const [interestFeed, setInterestFeed] = useState<NewsArticle[]>([])
const interestTickersRef = useRef<string[]>([])

useEffect(() => {
  interestTickersRef.current = interestTickers
}, [interestTickers])
```

### 2.3 New subscription: `onTickerOfInterest`

Add as its own `useEffect`, guarded on `userEmail` being known (this screen — and this
subscription — is meaningless without it). Follow the existing `onNewArticle` effect's structure
(try/catch around subscribing, `sub.unsubscribe()` on cleanup).

```typescript
useEffect(() => {
  if (!userEmail) return
  let sub: any
  try {
    const observable = (client as any).subscriptions?.onTickerOfInterest?.({ email: userEmail })
    if (!observable) {
      console.warn('[interest] onTickerOfInterest not available on client.subscriptions')
      return
    }
    sub = observable.subscribe({
      next: (raw: any) => {
        const payload = raw?.data?.onTickerOfInterest ?? raw?.onTickerOfInterest ?? raw
        const ticker = payload?.ticker
        if (!ticker) return
        setInterestTickers(prev => prev.includes(ticker) ? prev : [...prev, ticker])
      },
      error: (err: any) => console.error('[interest] onTickerOfInterest error:', err),
    })
  } catch (e) {
    console.error('[interest] onTickerOfInterest setup error:', e)
  }
  return () => sub?.unsubscribe?.()
}, [userEmail])
```

### 2.4 Extend the existing `onNewArticle` handler — do not add a second subscription

There is already exactly one `onNewArticle` subscription, in the `useEffect` starting around
line 147 (search for `client as any).subscriptions?.onNewArticle?.()`). It already branches on
whether the incoming article is a macro-screen article or a "ticker article," and within the
ticker-article branch, on whether that ticker is the one currently being viewed. **Add one more,
independent check inside that same `next:` callback — do not open a second subscription to
`onNewArticle`.** Two subscriptions to the same field would both receive every article, doubling
the client's subscription connections for no benefit, and risking double-handling if not careful.

The addition is independent of the existing if/else chain, because an article can simultaneously
be "the ticker I'm currently viewing" and "a ticker on my interest list" — both should happen.
Place it right after the existing `allowedSources` check near the top of the callback (so the
interest feed respects the same source permissions as everything else), before the existing
macro-screen / ticker-article branching:

```typescript
// Interest List feed: independent of whatever the user is currently viewing.
if (interestTickersRef.current.includes(article.ticker)) {
  const newId = article.id ?? Date.now()
  setInterestFeed(prev => [{
    id:            newId,
    ticker:        article.ticker        || '',
    headline:      article.headline      || '',
    summary:       article.summary       || '',
    article:       article.article       || '',
    publishedDate: article.publishedDate || new Date().toISOString(),
    source:        article.source        || '',
    url:           article.url           || '',
    importance:    article.importance    || '',
    category:      article.category      || '',
  }, ...prev])
}
```

### 2.5 Render: a new table branch with a ticker column

The news-table section currently branches only on `activeView !== 'db'` (macro table) vs. the
`db` single-ticker table. Add a third branch for `interest_list` before that check:

```typescript
{activeView === 'interest_list' ? (
  <div className="news-table-scroll" ref={tableScrollRef}>
    <div className="news-table">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Ticker</th>
            <th>Title</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {interestFeed.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No activity yet this session.
            </td></tr>
          ) : interestFeed.map((article) => (
            <tr key={article.id} className="article-row">
              <td className="date-cell">{formatDate(article.publishedDate)}</td>
              <td>{article.ticker}</td>
              <td className="headline-cell">{article.headline}</td>
              <td className="category-cell">{article.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
) : activeView !== 'db' ? (
  /* existing macro-news branch, unchanged */
```

This reuses `tableScrollRef` — the same ref the `db` table uses for its auto-height/scroll
behavior — so this table gets the same scrolling behavior for free (see the existing `useEffect`
that recalculates `tableScrollRef.current.style.maxHeight` on `[data]`; it doesn't currently
re-run on `interestFeed` changes, so add `interestFeed` to that effect's dependency array, or add
a small parallel effect that does the same recalculation when `interestFeed` changes and
`activeView === 'interest_list'`).

A more polished version of this table (accordion detail rows like the other two tables have, an
importance column, an unread indicator) is a reasonable follow-up, not required for a first
working version — keep the first sandbox pass simple and confirm the live-update mechanism works
before investing in matching the other tables' full feature set.

### 2.6 Nav button

Add an entry to the existing button array (search for `oil-btn-container`):

```typescript
{([
  ['oil_news',        'oil',          'OIL'],
  ['rates_news',      'rates',        'RATES'],
  ['fx_news',         'fx',           'FX'],
  ['inflation_news',  'inflation',    'INFLATION'],
  ['employment_news', 'employment',   'EMPLOYMENT'],
  ['trade_news',      'trade',        'TRADE'],
  ['interest_list',   'interest_list','WATCHLIST'],
] as [string, string, string][]).map(([view, key, label]) => (
```

No other change needed in that block — the existing `onClick`/active-state logic already works
generically off this array.

---

## Testing checklist (in the sandbox — see the warning at the top)

1. `npm run sandbox` — confirm it deploys cleanly and prints its own sandbox AppSync endpoint.
2. Open the app against the sandbox, with `?email=` set in the URL to some test address.
3. Manually invoke `notifyTickerOfInterest` (e.g. via the AppSync console's query explorer, or a
   quick script) with that same email and a test ticker — confirm the Watchlist screen's ticker
   list updates without a page refresh.
4. Call it again with a **different** email — confirm the same open tab does *not* react. This is
   the actual point of the email filter; don't skip this check.
5. Call `newArticle`/`publishNewArticle` (however articles currently get seeded in your sandbox)
   for a ticker now on the interest list — confirm it appears in the Watchlist feed live.
6. Call it for a ticker **not** on the interest list — confirm it does *not* appear there (while
   still behaving normally for the existing single-ticker/macro views).
7. Only after all of the above pass in the sandbox does it make sense to discuss moving this
   toward production — that discussion and decision happens separately, not as part of this spec.
