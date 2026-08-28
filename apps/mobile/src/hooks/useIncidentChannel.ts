import { useEffect, useRef, useState } from 'react'
import { devSession } from '../api/session'

/**
 * An event as it arrives on the incident channel.
 *
 * The server fans out its full `DomainEvent` envelope; screens care about the
 * type and payload, and about `version` so they can tell a stale render from a
 * current one.
 */
export interface IncidentEvent {
  eventId: string
  incidentId: string
  version: number
  type: string
  actorId: string | null
  occurredAt: string
  recordedAt: string
  payload: Record<string, unknown>
}

export interface IncidentChannel {
  /** Events received this connection, oldest first. */
  events: IncidentEvent[]
  /** The most recent event, or null before anything arrives. */
  latest: IncidentEvent | null
  connected: boolean
  /** Set when the server closed the socket with an application code. */
  closedReason: string | null
}

interface Options {
  /**
   * Called after every (re)connect.
   *
   * A dropped socket means missed events, and the channel has no replay. The
   * screen must refetch the read model here and treat the stream as resuming
   * from that point — otherwise a reconnect silently leaves the UI stale.
   */
  onResync?: () => void
  /** Injected in tests. */
  socketFactory?: (url: string) => WebSocket
}

const BASE_DELAY_MS = 500
const MAX_DELAY_MS = 15_000

/** App close codes the server uses. These are terminal — do not retry. */
const FATAL_CODES: Record<number, string> = {
  4001: 'unauthorized',
  4003: 'forbidden',
  4004: 'not found',
}

export function incidentChannelUrl(incidentId: string): string | null {
  const base = import.meta.env.VITE_API_URL
  if (!base) return null

  const ws = base.replace(/^http/, 'ws').replace(/\/$/, '')
  const session = devSession()

  // Browsers cannot set headers on a WebSocket handshake, so the server's auth
  // stub reads query params here. M4 replaces all three with one token.
  const params = new URLSearchParams()
  if (session) {
    params.set('user', session.userId)
    params.set('role', session.role)
    if (session.agencyId) params.set('agency', session.agencyId)
  }

  return `${ws}/ws/incidents/${incidentId}?${params.toString()}`
}

/**
 * Live incident channel.
 *
 * Reconnects with exponential backoff, except on the server's application
 * close codes — an unauthorized socket will still be unauthorized in a second,
 * and retrying it just burns a responder's battery and data.
 */
export function useIncidentChannel(
  incidentId: string | undefined,
  options: Options = {},
): IncidentChannel {
  const [events, setEvents] = useState<IncidentEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [closedReason, setClosedReason] = useState<string | null>(null)

  // Kept in refs so reconnecting never re-runs the effect and re-subscribes.
  const onResync = useRef(options.onResync)
  onResync.current = options.onResync
  const makeSocket = useRef(options.socketFactory)
  makeSocket.current = options.socketFactory

  useEffect(() => {
    if (!incidentId) return

    const url = incidentChannelUrl(incidentId)
    if (!url) return // running on the mock: no server to stream from

    let socket: WebSocket | null = null
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let attempt = 0
    let disposed = false

    const connect = () => {
      if (disposed) return
      socket = makeSocket.current ? makeSocket.current(url) : new WebSocket(url)

      socket.onopen = () => {
        if (disposed) return
        attempt = 0
        setConnected(true)
        setClosedReason(null)
        // Anything missed while disconnected is gone; the screen refetches.
        onResync.current?.()
      }

      socket.onmessage = (message: MessageEvent) => {
        if (disposed) return

        // Parse before touching state: React runs a state updater during
        // render, where a throw would escape this catch and blank the screen.
        let event: IncidentEvent
        try {
          event = JSON.parse(String(message.data)) as IncidentEvent
        } catch {
          // A malformed frame must not tear down a live incident view.
          return
        }
        setEvents((prev) => [...prev, event])
      }

      socket.onclose = (closeEvent: CloseEvent) => {
        if (disposed) return
        setConnected(false)

        const fatal = FATAL_CODES[closeEvent.code]
        if (fatal) {
          setClosedReason(fatal)
          return
        }

        const delay = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS)
        attempt += 1
        retryTimer = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      disposed = true
      clearTimeout(retryTimer)
      socket?.close()
    }
  }, [incidentId])

  return {
    events,
    latest: events.length ? events[events.length - 1]! : null,
    connected,
    closedReason,
  }
}
