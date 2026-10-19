import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'
import type { ExchangeFn } from './accessSession'

/**
 * Pre-login operations use the guest IAM identity (the only credentials available before
 * a session exists). They are rate limited by AWS WAF and reveal nothing about valid tokens.
 */
const guest = generateClient<Schema>({ authMode: 'iam' })

// LOCAL TESTING ONLY (vite dev): talk to amplify/scripts/access/dev-server.ts instead of AppSync.
const DEV_API: string | undefined = import.meta.env.DEV ? import.meta.env.VITE_ACCESS_DEV_API : undefined

async function devPost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${DEV_API}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`dev api ${r.status}`)
  return r.json() as Promise<T>
}

export const exchangeViaAppSync: ExchangeFn = async (token) => {
  if (DEV_API) return devPost('/exchangeToken', { token })
  const { data, errors } = await guest.mutations.exchangeToken({ token })
  if (errors?.length || !data) throw new Error(errors?.[0]?.message ?? 'exchange failed')
  if (data.status !== 'ok' || !data.session || !data.email) return { status: 'invalid' }
  return {
    status: 'ok',
    session: data.session,
    sessionExpiresAt: data.sessionExpiresAt ?? 0,
    email: data.email,
    allowedSources: (data.allowedSources ?? []).filter(Boolean) as string[],
    department: data.department ?? 'equity',
    linkToken: data.linkToken ?? null,
    linkTokenExpiresAt: data.linkTokenExpiresAt ?? 0,
  }
}
