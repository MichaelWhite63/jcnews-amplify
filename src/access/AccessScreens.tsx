import type { AccessController, AccessState } from './accessSession'
import './access.css'

export default function AccessScreens({ controller, state }: { controller: AccessController; state: AccessState }) {
  if (state.kind === 'loading') {
    return (
      <div className="access-screen" role="status" aria-live="polite">
        <div className="access-card"><div className="access-spinner" /><p>Checking your access…</p></div>
      </div>
    )
  }
  if (state.kind === 'error') {
    return (
      <div className="access-screen">
        <div className="access-card">
          <h1>Can't connect</h1>
          <p>{state.message}</p>
          <button className="access-primary" onClick={() => controller.retry()}>Retry</button>
        </div>
      </div>
    )
  }
  if (state.kind === 'needs-link') return <ReopenFromVendor reason={state.reason} />
  return null
}

/**
 * Links are delivered only through the vendor application (every ticker link it shows carries
 * today's token), so there is nothing to request here: the user reopens a link from the vendor app.
 */
function ReopenFromVendor({ reason }: { reason: 'none' | 'legacy-email' | 'expired' }) {
  const title = reason === 'expired' ? 'This link is no longer valid'
    : reason === 'legacy-email' ? 'This link format is no longer supported'
    : 'Access required'
  return (
    <div className="access-screen">
      <div className="access-card">
        <h1>{title}</h1>
        <p>Please open the ticker again from your vendor application. Every ticker link it shows signs you in to JC News automatically.</p>
      </div>
    </div>
  )
}
