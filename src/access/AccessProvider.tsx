import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { AccessController, STORAGE_KEY, type Env } from './accessSession'
import { exchangeViaAppSync } from './exchangeClient'
import AccessScreens from './AccessScreens'

export interface AccessContextValue {
  email: string
  session: string
  allowedSources: string[]
  department: string
  signOut: () => void
  /** Per-request options for the Amplify data client: { authMode: 'lambda', authToken } */
  authOpts: () => { authMode: 'lambda'; authToken: string } | { authMode: 'iam' }
}

// LOCAL TESTING ONLY: under `vite dev` with VITE_ACCESS_DATA_AUTH=iam, data calls use the legacy
// guest mode (for testing against the local dev-server, whose JWTs the deployed authorizer rejects).
const DEV_DATA_IAM = import.meta.env.DEV && import.meta.env.VITE_ACCESS_DATA_AUTH === 'iam'

const AccessContext = createContext<AccessContextValue | null>(null)

/** Components under <AccessProvider> only render once a verified session exists. */
export function useAccess(): AccessContextValue {
  const v = useContext(AccessContext)
  if (!v) throw new Error('useAccess must be used inside a ready <AccessProvider>')
  return v
}

function browserEnv(): Env {
  return {
    storage: window.localStorage,
    exchange: exchangeViaAppSync,
    now: () => Date.now(),
    // Keep ticker (and any other params); token & legacy email are removed. No new history entry.
    replaceUrl: (search) => window.history.replaceState(null, '', `${window.location.pathname}${search}${window.location.hash}`),
    // Serialise exchanges across tabs so only one rotates the link token at a time.
    withLock: <T,>(fn: () => Promise<T>): Promise<T> =>
      navigator.locks ? (navigator.locks.request('jcnews-access-exchange', fn) as Promise<T>) : fn(),
  }
}

export function AccessProvider({ children }: { children: ReactNode }) {
  const controller = useMemo(() => new AccessController(browserEnv()), [])
  const state = useSyncExternalStore(controller.subscribe.bind(controller), controller.getState)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (started) return
    setStarted(true)
    void controller.bootstrap(window.location.search)
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY || e.key === null) controller.onStorageChanged() }
    const onVisible = () => { if (document.visibilityState === 'visible') void controller.refresh() }
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [controller, started])

  // Context value is rebuilt only when the session changes (every ~10h), so App re-subscribes then.
  const value = useMemo<AccessContextValue | null>(() => {
    if (state.kind !== 'ready') return null
    return {
      email: state.email,
      session: state.session,
      allowedSources: state.allowedSources,
      department: state.department,
      signOut: () => controller.signOut(),
      authOpts: () => (DEV_DATA_IAM ? { authMode: 'iam' as const } : controller.authOpts()),
    }
  }, [state, controller])

  if (!value) return <AccessScreens controller={controller} state={state} />
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}
