/**
 * Reads the browser session identity that the Lambda authorizer placed in
 * ctx.identity.resolverContext. Returns null for guest-IAM callers (legacy / publisher).
 * When present, handlers MUST use these values instead of client-supplied arguments.
 */
export interface SessionIdentity { email: string; allowedSources: string[]; department: string; personId: number }

export function sessionIdentity(event: any): SessionIdentity | null {
  const rc = event?.identity?.resolverContext;
  if (!rc || typeof rc.email !== 'string' || !rc.email) return null;
  let allowedSources: string[] = [];
  try {
    const parsed = typeof rc.allowedSources === 'string' ? JSON.parse(rc.allowedSources) : rc.allowedSources;
    if (Array.isArray(parsed)) allowedSources = parsed.filter((s) => typeof s === 'string');
  } catch { allowedSources = []; }   // default-deny: unparsable -> no sources
  return { email: rc.email, allowedSources, department: rc.department || 'equity', personId: Number(rc.personId) };
}
