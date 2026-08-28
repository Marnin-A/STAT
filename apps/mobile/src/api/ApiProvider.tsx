import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { HttpApiClient, MockApiClient, type ApiClient } from '@stat/shared'
import { authHeadersFor, devSession } from './session'

const ApiContext = createContext<ApiClient | null>(null)

interface ApiProviderProps {
  children: ReactNode
  /** Injected by tests. When absent the client is chosen from the environment. */
  client?: ApiClient
}

/**
 * Picks the transport once, at mount.
 *
 * With `VITE_API_URL` set the app talks to a real backend; without it, it runs
 * entirely on `MockApiClient`. Tests pass `client` directly and never touch
 * either branch.
 */
function createClient(): ApiClient {
  const baseUrl = import.meta.env.VITE_API_URL
  if (!baseUrl) return new MockApiClient()

  return new HttpApiClient({
    baseUrl,
    authHeaders: () => authHeadersFor(devSession()),
  })
}

export function ApiProvider({ children, client }: ApiProviderProps) {
  const apiClient = useMemo(() => client ?? createClient(), [client])

  return <ApiContext.Provider value={apiClient}>{children}</ApiContext.Provider>
}

export function useApi(): ApiClient {
  const client = useContext(ApiContext)
  if (!client) {
    throw new Error('useApi must be used within ApiProvider')
  }
  return client
}
