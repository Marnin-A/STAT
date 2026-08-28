import type { Role } from '@stat/shared'

/**
 * Who the app says it is.
 *
 * **Interim (M4 replaces this).** The server's `resolvePrincipal` is still a
 * header stub, so this returns the same stub headers. There is no security
 * here — anyone can claim any role until Better Auth lands. It exists so the
 * app can talk to a real server now, and so there is exactly one place to swap
 * for a bearer token later.
 */
export interface Session {
  userId: string
  role: Role
  agencyId?: string
}

const env = import.meta.env

export function devSession(): Session | null {
  const userId = env.VITE_DEV_USER_ID
  if (!userId) return null
  return {
    userId,
    role: (env.VITE_DEV_ROLE as Role | undefined) ?? 'responder',
    agencyId: env.VITE_DEV_AGENCY_ID,
  }
}

export function authHeadersFor(session: Session | null): Record<string, string> {
  if (!session) return {}
  const headers: Record<string, string> = {
    'x-user-id': session.userId,
    'x-role': session.role,
  }
  if (session.agencyId) headers['x-agency-id'] = session.agencyId
  return headers
}
