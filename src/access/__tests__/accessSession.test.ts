import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AccessController, STORAGE_KEY, parseUrl, type Env, type ExchangeResponse, type StoredAccess } from '../accessSession'

class MemStorage {
  m = new Map<string, string>()
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
}

const T0 = 1_900_000_000_000
function setup(responses: Record<string, ExchangeResponse | Error> = {}) {
  const storage = new MemStorage()
  const events: string[] = []
  let now = T0
  const timers: { fn: () => void; ms: number }[] = []
  const env: Env = {
    storage,
    now: () => now,
    replaceUrl: (s) => events.push(`replace:${s}`),
    exchange: async (t) => {
      events.push(`exchange:${t}`)
      const r = responses[t]
      if (r instanceof Error) throw r
      return r ?? { status: 'invalid' }
    },
    setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length },
    clearTimer: () => {},
  }
  return { env, storage, events, timers, advance: (s: number) => { now += s * 1000 }, c: new AccessController(env) }
}
const nowSec = Math.floor(T0 / 1000)
const ok = (over: Partial<Extract<ExchangeResponse, { status: 'ok' }>> = {}): ExchangeResponse => ({
  status: 'ok', session: 'jwt-1', sessionExpiresAt: nowSec + 36000, email: 'alice@example.com',
  allowedSources: ['DowJones'], department: 'equity', linkToken: null, linkTokenExpiresAt: nowSec + 90 * 86400, ...over,
})
const stored = (over: Partial<StoredAccess> = {}): StoredAccess => ({
  linkToken: 'L1', linkTokenExp: nowSec + 86400, session: 'jwt-old', sessionExp: nowSec + 3600,
  email: 'alice@example.com', allowedSources: ['DowJones'], department: 'equity', ...over,
})

test('parseUrl strips token and legacy email, keeps ticker and other params', () => {
  assert.deepEqual(parseUrl('?ticker=AAPL%20US&email=user%40example.com&token=abc&x=1'),
    { token: 'abc', legacyEmail: 'user@example.com', ticker: 'AAPL US', cleanedSearch: '?ticker=AAPL+US&x=1' })
  assert.equal(parseUrl('?token=abc').cleanedSearch, '')
})

test('first visit: URL stripped BEFORE exchange; session + link token stored; ready', async () => {
  const { c, events, storage, timers } = setup({ TOK: ok() })
  await c.bootstrap('?ticker=AAPL%20US&token=TOK')
  assert.deepEqual(events.slice(0, 2), ['replace:?ticker=AAPL+US', 'exchange:TOK'])
  assert.equal(c.state.kind, 'ready')
  const s = JSON.parse(storage.getItem(STORAGE_KEY)!)
  assert.equal(s.linkToken, 'TOK')
  assert.equal(s.session, 'jwt-1')
  assert.deepEqual(c.authOpts(), { authMode: 'lambda', authToken: 'jwt-1' })
  assert.equal(timers.at(-1)!.ms, (36000 - 120) * 1000, 'refresh scheduled 2 min before expiry')
})

test('rotation: replacement link token from the server replaces the stored one', async () => {
  const { c, storage } = setup({ OLD: ok({ linkToken: 'NEW', session: 'jwt-r' }) })
  await c.bootstrap('?token=OLD')
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)!).linkToken, 'NEW')
})

test('new tab / return visit with a fresh stored session: no network call', async () => {
  const { c, storage, events } = setup()
  storage.setItem(STORAGE_KEY, JSON.stringify(stored()))
  await c.bootstrap('?ticker=MSFT%20US')
  assert.equal(c.state.kind, 'ready')
  assert.ok(!events.some((e) => e.startsWith('exchange')))
})

test('return visit with expired session but valid link token: silent exchange', async () => {
  const { c, storage, events } = setup({ L1: ok({ session: 'jwt-2' }) })
  storage.setItem(STORAGE_KEY, JSON.stringify(stored({ sessionExp: nowSec - 5 })))
  await c.bootstrap('')
  assert.deepEqual(events, ['exchange:L1'])
  assert.equal(c.state.kind === 'ready' && c.state.session, 'jwt-2')
})

test('expired link token (stored) -> request-link screen and storage cleared', async () => {
  const { c, storage } = setup()
  storage.setItem(STORAGE_KEY, JSON.stringify(stored({ sessionExp: nowSec - 5, linkTokenExp: nowSec - 1 })))
  await c.bootstrap('')
  assert.deepEqual(c.state, { kind: 'needs-link', reason: 'expired' })
  assert.equal(storage.getItem(STORAGE_KEY), null)
})

test('revoked (server says invalid) -> request-link screen', async () => {
  const { c, storage } = setup({ L1: { status: 'invalid' } })
  storage.setItem(STORAGE_KEY, JSON.stringify(stored({ sessionExp: nowSec - 5 })))
  await c.bootstrap('')
  assert.deepEqual(c.state, { kind: 'needs-link', reason: 'expired' })
})

test('dead URL token falls back to valid stored credentials', async () => {
  const { c, storage } = setup({ DEAD: { status: 'invalid' } })
  storage.setItem(STORAGE_KEY, JSON.stringify(stored()))
  await c.bootstrap('?token=DEAD')
  assert.equal(c.state.kind, 'ready')
})

test('dead URL token with nothing stored -> expired screen', async () => {
  const { c } = setup()
  await c.bootstrap('?token=DEAD')
  assert.deepEqual(c.state, { kind: 'needs-link', reason: 'expired' })
})

test('legacy ?email= link -> reopen-from-vendor screen, email removed from URL', async () => {
  const { c, events } = setup()
  await c.bootstrap('?ticker=AAPL%20US&email=user%40example.com')
  assert.deepEqual(c.state, { kind: 'needs-link', reason: 'legacy-email' })
  assert.ok(events.includes('replace:?ticker=AAPL+US'))
  assert.ok(!events.some((e) => e.startsWith('exchange:')), 'no exchange for an email-only link')
})

test('no params, nothing stored -> access required', async () => {
  const { c } = setup()
  await c.bootstrap('')
  assert.deepEqual(c.state, { kind: 'needs-link', reason: 'none' })
})

test('network error: error state if no usable session; keeps working session otherwise', async () => {
  const a = setup({ TOK: new Error('offline') })
  await a.c.bootstrap('?token=TOK')
  assert.equal(a.c.state.kind, 'error')

  const b = setup({ L1: new Error('offline') })
  b.storage.setItem(STORAGE_KEY, JSON.stringify(stored({ sessionExp: nowSec + 60 })))
  await b.c.refresh() // state loading -> refresh path
  assert.equal(b.c.state.kind, 'ready', 'still usable for its remaining lifetime')
  assert.ok(b.storage.getItem(STORAGE_KEY), 'credentials kept')
})

test('timer refresh exchanges the stored link token near expiry', async () => {
  const { c, storage, events, advance } = setup({ L1: ok({ session: 'jwt-3', sessionExpiresAt: nowSec + 2 * 36000 }) })
  storage.setItem(STORAGE_KEY, JSON.stringify(stored({ sessionExp: nowSec + 3600 })))
  await c.bootstrap('')
  advance(3600 - 100)
  await c.refresh()
  assert.ok(events.includes('exchange:L1'))
  assert.equal(c.state.kind === 'ready' && c.state.session, 'jwt-3')
})

test('another tab refreshed: storage event adopts its session; sign-out elsewhere signs this tab out', async () => {
  const { c, storage } = setup()
  storage.setItem(STORAGE_KEY, JSON.stringify(stored()))
  await c.bootstrap('')
  storage.setItem(STORAGE_KEY, JSON.stringify(stored({ session: 'jwt-other-tab', sessionExp: nowSec + 36000 })))
  c.onStorageChanged()
  assert.equal(c.state.kind === 'ready' && c.state.session, 'jwt-other-tab')
  storage.removeItem(STORAGE_KEY)
  c.onStorageChanged()
  assert.equal(c.state.kind, 'needs-link')
})

test('sign out clears credentials and per-user UI state', async () => {
  const { c, storage } = setup()
  storage.setItem(STORAGE_KEY, JSON.stringify(stored()))
  storage.setItem('interestTickers', '[]')
  await c.bootstrap('')
  c.signOut()
  assert.equal(storage.getItem(STORAGE_KEY), null)
  assert.equal(storage.getItem('interestTickers'), null)
  assert.deepEqual(c.state, { kind: 'needs-link', reason: 'none' })
  assert.equal(c.authOpts().authToken, '')
})

test('switching person on the same browser clears previous person UI state', async () => {
  const { c, storage } = setup({ BOB: ok({ email: 'bob@example.com' }) })
  storage.setItem(STORAGE_KEY, JSON.stringify(stored()))
  storage.setItem('interestTickers', '[{"ticker":"AAPL US"}]')
  await c.bootstrap('?token=BOB')
  assert.equal(storage.getItem('interestTickers'), null)
  assert.equal(c.state.kind === 'ready' && c.state.email, 'bob@example.com')
})
