/**
 * Browser-side access session logic (framework-free so it can be unit-tested).
 *
 * Stored in localStorage (shared by all tabs of equity.jcnews.ai):
 *   { linkToken, linkTokenExp, session, sessionExp, email, allowedSources, department }
 * The long-lived link token is the credential; the 10h session JWT is derived from it.
 */

export const STORAGE_KEY = 'jcnews.access.v1'
const REFRESH_MARGIN_SEC = 120      // refresh this long before the session expires
const MIN_VALID_SEC = 30            // a session with less than this left is treated as expired
const SKIP_EXCHANGE_MIN_SEC = 300   // ?token= for the already-signed-in person skips the exchange if the session has more than this left
const LEGACY_CLEAR_KEYS = ['interestTickers', 'unreadScreens', 'tickerSearchHistory'] // per-user UI state

export interface ExchangeOk {
  status: 'ok'
  session: string
  sessionExpiresAt: number
  email: string
  allowedSources: string[]
  department: string
  linkToken: string | null
  linkTokenExpiresAt: number
}
export type ExchangeResponse = ExchangeOk | { status: 'invalid' }

/** Throws on network / server errors (distinct from a definitive 'invalid'). */
export type ExchangeFn = (token: string) => Promise<ExchangeResponse>

export interface StoredAccess {
  linkToken: string
  linkTokenExp: number
  session: string
  sessionExp: number
  email: string
  allowedSources: string[]
  department: string
}

export type AccessState =
  | { kind: 'loading' }
  | { kind: 'ready'; email: string; session: string; allowedSources: string[]; department: string }
  | { kind: 'needs-link'; reason: 'none' | 'legacy-email' | 'expired' }
  | { kind: 'error'; message: string }

export interface StorageLike {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
}

export interface UrlInfo {
  token: string | null
  legacyEmail: string | null
  ticker: string | null
  cleanedSearch: string // search string with token & email removed (ticker etc. kept)
}

export function parseUrl(search: string): UrlInfo {
  const p = new URLSearchParams(search)
  const token = p.get('token')
  const legacyEmail = p.get('email')
  const ticker = p.get('ticker')
  p.delete('token')
  p.delete('email')
  const rest = p.toString()
  return { token: token || null, legacyEmail: legacyEmail || null, ticker, cleanedSearch: rest ? `?${rest}` : '' }
}

/** Person id from a link token's payload ("v1.<kid>.<personId>.<day>"). Decode only: NOT verified. */
export function linkTokenPersonId(token: string): number | null {
  try {
    const payload = token.split('.')[0]
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const m = /^v1\.[A-Za-z0-9_-]{1,16}\.([1-9][0-9]{0,14})\.[0-9]{8}$/.exec(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)))
    return m ? Number(m[1]) : null
  } catch { return null }
}

export interface Env {
  storage: StorageLike
  exchange: ExchangeFn
  now: () => number // ms
  /** Replace the address bar without adding history. */
  replaceUrl: (search: string) => void
  /** Serialises exchanges across tabs. Default: run directly. */
  withLock?: <T>(fn: () => Promise<T>) => Promise<T>
  setTimer?: (fn: () => void, ms: number) => unknown
  clearTimer?: (h: unknown) => void
}

const sec = (ms: number) => Math.floor(ms / 1000)

export function readStored(storage: StorageLike): StoredAccess | null {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (typeof v?.linkToken !== 'string' || typeof v?.email !== 'string') return null
    return v as StoredAccess
  } catch { return null }
}

export class AccessController {
  state: AccessState = { kind: 'loading' }
  ticker: string | null = null
  private listeners = new Set<() => void>()
  private timer: unknown = null
  private disposed = false
  /** Set once an `?email=` link was seen. bootstrap() can run twice (React StrictMode) and the
   *  first run strips `email=` from the URL, so the second run must not forget it. */
  private sawLegacyEmail = false

  constructor(private env: Env) {}

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  getState = () => this.state
  private set(s: AccessState) { this.state = s; this.listeners.forEach((l) => l()) }
  dispose() { this.disposed = true; this.clearTimer() }

  /** Call once at startup with window.location.search. */
  async bootstrap(search: string): Promise<void> {
    const url = parseUrl(search)
    this.ticker = url.ticker
    if (url.legacyEmail) this.sawLegacyEmail = true
    // Strip secrets from the address bar immediately (before any network call), keeping ticker.
    if (url.token || url.legacyEmail) this.env.replaceUrl(url.cleanedSearch)

    const stored = readStored(this.env.storage)

    if (url.token) {
      // Already signed in as the person this link is for, with a healthy session: nothing to exchange.
      // Decode-only is safe here because the stored session was verified when it was issued.
      if (stored && this.isSamePersonWithFreshSession(url.token, stored)) {
        this.adopt(stored)
        return
      }
      const r = await this.tryExchange(url.token, stored)
      if (r === 'ok' || r === 'error') return
      // Link in the URL is dead. Fall back to stored credentials if there are any.
      if (stored && (await this.useStored(stored)) !== 'invalid') return
      this.set({ kind: 'needs-link', reason: 'expired' })
      return
    }

    if (stored) {
      const res = await this.useStored(stored)
      if (res === 'invalid') {
        this.set({ kind: 'needs-link', reason: this.sawLegacyEmail ? 'legacy-email' : 'expired' })
      }
      return
    }
    this.set({ kind: 'needs-link', reason: this.sawLegacyEmail ? 'legacy-email' : 'none' })
  }

  private isSamePersonWithFreshSession(token: string, stored: StoredAccess): boolean {
    const now = sec(this.env.now())
    if (stored.sessionExp - now <= SKIP_EXCHANGE_MIN_SEC || stored.linkTokenExp <= now) return false
    const id = linkTokenPersonId(token)
    return id !== null && id === linkTokenPersonId(stored.linkToken)
  }

  /** Use stored session if still valid, else silently exchange the stored link token. */
  private async useStored(stored: StoredAccess): Promise<'ok' | 'invalid' | 'error'> {
    const now = sec(this.env.now())
    if (stored.sessionExp - now > MIN_VALID_SEC && stored.linkTokenExp > now) {
      this.adopt(stored)
      return 'ok'
    }
    if (stored.linkTokenExp <= now) { this.clearStored(); return 'invalid' }
    return this.tryExchange(stored.linkToken, stored)
  }

  private adopt(s: StoredAccess) {
    this.set({ kind: 'ready', email: s.email, session: s.session, allowedSources: s.allowedSources, department: s.department })
    this.schedule(s.sessionExp)
  }

  private async tryExchange(token: string, previous: StoredAccess | null): Promise<'ok' | 'invalid' | 'error'> {
    const run = async (): Promise<'ok' | 'invalid' | 'error'> => {
      // Another tab may have just refreshed: adopt its result instead of exchanging again.
      const latest = readStored(this.env.storage)
      const now = sec(this.env.now())
      if (latest && latest.sessionExp - now > REFRESH_MARGIN_SEC + MIN_VALID_SEC && latest.linkTokenExp > now &&
          (token === latest.linkToken || token === previous?.linkToken) && latest.session !== previous?.session) {
        this.adopt(latest)
        return 'ok'
      }
      let res: ExchangeResponse
      try {
        res = await this.env.exchange(token)
      } catch (e) {
        // Network/server problem: not proof the link is bad. Keep stored creds and let the user retry.
        const keep = previous && previous.sessionExp - sec(this.env.now()) > MIN_VALID_SEC
        if (keep && previous) { this.adopt(previous); return 'ok' }
        this.set({ kind: 'error', message: 'Could not reach the server. Check your connection and retry.' })
        return 'error'
      }
      if (res.status !== 'ok') {
        this.clearStored()
        return 'invalid'
      }
      const stored: StoredAccess = {
        // Rotation returns a replacement link token; otherwise keep the one we used.
        linkToken: res.linkToken ?? token,
        linkTokenExp: res.linkTokenExpiresAt,
        session: res.session,
        sessionExp: res.sessionExpiresAt,
        email: res.email,
        allowedSources: res.allowedSources ?? [],
        department: res.department,
      }
      // New person on this browser -> drop the previous person's local UI state.
      if (previous && previous.email.toLowerCase() !== res.email.toLowerCase()) this.clearUserUiState()
      this.env.storage.setItem(STORAGE_KEY, JSON.stringify(stored))
      this.adopt(stored)
      return 'ok'
    }
    return (this.env.withLock ?? ((f) => f()))(run)
  }

  private schedule(sessionExp: number) {
    this.clearTimer()
    if (this.disposed) return
    const delaySec = Math.max(5, sessionExp - REFRESH_MARGIN_SEC - sec(this.env.now()))
    const set = this.env.setTimer ?? ((fn, ms) => setTimeout(fn, ms))
    this.timer = set(() => { void this.refresh() }, Math.min(delaySec, 2_000_000) * 1000)
  }
  private clearTimer() {
    if (this.timer !== null) (this.env.clearTimer ?? ((h) => clearTimeout(h as number)))(this.timer)
    this.timer = null
  }

  /** Silent refresh (timer, tab becoming visible, storage event from another tab). */
  async refresh(): Promise<void> {
    if (this.disposed || this.state.kind === 'needs-link') return
    const stored = readStored(this.env.storage)
    if (!stored) { this.set({ kind: 'needs-link', reason: 'expired' }); return }
    const now = sec(this.env.now())
    if (stored.sessionExp - now > REFRESH_MARGIN_SEC) { this.adopt(stored); return }
    const r = await this.useStoredForce(stored)
    if (r === 'invalid') this.set({ kind: 'needs-link', reason: 'expired' })
  }
  private async useStoredForce(stored: StoredAccess) {
    if (stored.linkTokenExp <= sec(this.env.now())) { this.clearStored(); return 'invalid' as const }
    return this.tryExchange(stored.linkToken, stored)
  }

  /** Another tab changed localStorage. */
  onStorageChanged() {
    if (this.disposed) return
    const stored = readStored(this.env.storage)
    if (!stored) {
      if (this.state.kind === 'ready') this.set({ kind: 'needs-link', reason: 'none' }) // signed out elsewhere
      return
    }
    const now = sec(this.env.now())
    if (stored.sessionExp - now > MIN_VALID_SEC) {
      if (this.state.kind !== 'ready' || this.state.session !== stored.session) this.adopt(stored)
    }
  }

  retry() { this.set({ kind: 'loading' }); void this.bootstrap(typeof location !== 'undefined' ? location.search : '') }

  signOut() {
    this.clearStored()
    this.clearUserUiState()
    this.clearTimer()
    this.set({ kind: 'needs-link', reason: 'none' })
  }

  /** What the data client sends with every request. */
  authOpts() {
    const s = this.state
    return { authMode: 'lambda' as const, authToken: s.kind === 'ready' ? s.session : '' }
  }

  private clearStored() { this.env.storage.removeItem(STORAGE_KEY) }
  private clearUserUiState() { for (const k of LEGACY_CLEAR_KEYS) this.env.storage.removeItem(k) }
}
