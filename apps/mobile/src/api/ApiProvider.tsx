import { createContext, useContext, useMemo, ReactNode } from 'react'
import { ApiClient, MockApiClient } from '@stat/shared'

const ApiContext = createContext<ApiClient | null>(null)

interface ApiProviderProps {
  children: ReactNode
  client?: ApiClient
}

export function ApiProvider({ children, client }: ApiProviderProps) {
  const apiClient = useMemo(() => client ?? new MockApiClient(), [client])

  return (
    <ApiContext.Provider value={apiClient}>
      {children}
    </ApiContext.Provider>
  )
}

export function useApi(): ApiClient {
  const client = useContext(ApiContext)
  if (!client) {
    throw new Error('useApi must be used within ApiProvider')
  }
  return client
}
