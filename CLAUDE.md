# JC News Amplify — Project Notes

## Ticker of Interest / Watchlist

The `interestTickers` list is persisted to `localStorage` with a 72-hour (calendar) expiry.

**Planned change**: replace the 72-hour calendar cutoff with a business-day calculation that skips weekends (Saturday and Sunday). Holidays are excluded from this logic — they are too inconsistent to maintain.

Implementation sketch (when ready):
- On save, compute expiry by calling `addBusinessDays(new Date(), 3)` and storing the expiry timestamp instead of `ts: Date.now()`
- On load, filter by `e.expiry > Date.now()` instead of `e.ts > cutoff`
- `addBusinessDays` increments day-by-day, skipping `getDay() === 0` (Sunday) and `getDay() === 6` (Saturday)

## Critical Constraints

- **Never commit the sandbox `amplify_outputs.json`** — always run `git checkout amplify_outputs.json` after stopping the sandbox. The sandbox AppSync endpoint is `pqt7gbtx5vejdphzonk65k3ehm`; production is `g54zkvq6ezftzlpwy4mojsbdju`.
- **Demo branch `demo/zxyz-hardcoded` must never be merged to `main`** — it contains hardcoded ZXYZ US data for demonstration purposes only and will be removed after the demo.
- Production site: `https://equity.jcnews.ai/` — deployed automatically when `main` is pushed to GitHub.
