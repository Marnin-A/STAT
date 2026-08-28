import { useEffect, useRef, useState } from 'react'
import type { IncidentEvent } from './useIncidentChannel'

/**
 * The dispatcher / hospital firehose over SSE.
 *
 * Agency-scoped server-side (admins get everything). Unlike the incident
 * channel this is read-only and one-way, which is why it is SSE rather than a
 * socket: EventSource reconnects on its own and costs less on a weak link.
 */
export interface DashboardStream {
  latest: IncidentEvent | null
  /** Bumped on every event, so a screen can refetch without diffing payloads. */
  revision: number
  connected: boolean
}

interface Options {
  onEvent?: (event: IncidentEvent) => void
  /** Injected in tests. */
  sourceFactory?: (url: string) => EventSource
}

export function dashboardStreamUrl(): string | null {
  const base = import.meta.env.VITE_API_URL
  return base ? `${base.replace(/\/$/, '')}/dashboard/stream` : null
}

export function useDashboardStream(options: Options = {}): DashboardStream {
  const [latest, setLatest] = useState<IncidentEvent | null>(null)
  const [revision, setRevision] = useState(0)
  const [connected, setConnected] = useState(false)

  const onEvent = useRef(options.onEvent)
  onEvent.current = options.onEvent
  const makeSource = useRef(options.sourceFactory)
  makeSource.current = options.sourceFactory

  useEffect(() => {
    const url = dashboardStreamUrl()
    if (!url) return // running on the mock

    // NOTE: EventSource cannot send headers, so this only authenticates once
    // the session is a cookie or the URL carries a token (M4). Against the
    // current header stub the server will reject it as anonymous.
    const source = makeSource.current ? makeSource.current(url) : new EventSource(url)

    source.onopen = () => setConnected(true)
    source.onerror = () => setConnected(false)

    source.onmessage = (message: MessageEvent) => {
      let event: IncidentEvent
      try {
        event = JSON.parse(String(message.data)) as IncidentEvent
      } catch {
        return // a bad frame must not tear down the board
      }
      setLatest(event)
      setRevision((r) => r + 1)
      onEvent.current?.(event)
    }

    return () => source.close()
  }, [])

  return { latest, revision, connected }
}
