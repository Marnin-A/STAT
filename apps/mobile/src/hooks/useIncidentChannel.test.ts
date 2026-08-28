import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useIncidentChannel, type IncidentEvent } from './useIncidentChannel'

/**
 * A WebSocket stand-in the test drives by hand, so reconnect and close-code
 * behaviour can be exercised without a server.
 */
class FakeSocket {
  static instances: FakeSocket[] = []

  onopen: (() => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onclose: ((e: CloseEvent) => void) | null = null
  closed = false

  constructor(readonly url: string) {
    FakeSocket.instances.push(this)
  }

  open() {
    this.onopen?.()
  }

  deliver(event: Partial<IncidentEvent>) {
    this.onmessage?.({ data: JSON.stringify(event) } as MessageEvent)
  }

  deliverRaw(data: string) {
    this.onmessage?.({ data } as MessageEvent)
  }

  serverClose(code: number) {
    this.onclose?.({ code } as CloseEvent)
  }

  close() {
    this.closed = true
  }
}

function factory(url: string) {
  return new FakeSocket(url) as unknown as WebSocket
}

const INCIDENT = 'inc-1'

describe('useIncidentChannel', () => {
  beforeEach(() => {
    FakeSocket.instances = []
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000')
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('connects to the incident channel over ws', () => {
    renderHook(() => useIncidentChannel(INCIDENT, { socketFactory: factory }))

    expect(FakeSocket.instances).toHaveLength(1)
    expect(FakeSocket.instances[0]!.url).toContain('ws://localhost:3000/ws/incidents/inc-1')
  })

  it('collects events in arrival order', async () => {
    const { result } = renderHook(() =>
      useIncidentChannel(INCIDENT, { socketFactory: factory }),
    )
    const socket = FakeSocket.instances[0]!

    act(() => socket.open())
    act(() => socket.deliver({ eventId: 'e1', type: 'IncidentStatusChanged', version: 2 }))
    act(() => socket.deliver({ eventId: 'e2', type: 'TelemetryRecorded', version: 3 }))

    await waitFor(() => expect(result.current.events).toHaveLength(2))
    expect(result.current.latest?.eventId).toBe('e2')
    expect(result.current.connected).toBe(true)
  })

  it('survives a malformed frame', async () => {
    const { result } = renderHook(() =>
      useIncidentChannel(INCIDENT, { socketFactory: factory }),
    )
    const socket = FakeSocket.instances[0]!

    act(() => socket.open())
    act(() => socket.deliverRaw('{not json'))
    act(() => socket.deliver({ eventId: 'e1', type: 'IncidentStatusChanged' }))

    // A bad frame must not tear down a live incident view.
    await waitFor(() => expect(result.current.events).toHaveLength(1))
    expect(result.current.connected).toBe(true)
  })

  it('asks the screen to resync on every connect', async () => {
    const onResync = vi.fn()
    renderHook(() => useIncidentChannel(INCIDENT, { socketFactory: factory, onResync }))

    act(() => FakeSocket.instances[0]!.open())
    expect(onResync).toHaveBeenCalledTimes(1)

    // Drop, reconnect: whatever was missed is gone, so the screen refetches.
    act(() => FakeSocket.instances[0]!.serverClose(1006))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    expect(FakeSocket.instances).toHaveLength(2)
    act(() => FakeSocket.instances[1]!.open())
    expect(onResync).toHaveBeenCalledTimes(2)
  })

  it('backs off between reconnect attempts', async () => {
    renderHook(() => useIncidentChannel(INCIDENT, { socketFactory: factory }))

    act(() => FakeSocket.instances[0]!.serverClose(1006))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(FakeSocket.instances).toHaveLength(2)

    // Second failure waits longer than the first.
    act(() => FakeSocket.instances[1]!.serverClose(1006))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(FakeSocket.instances).toHaveLength(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(FakeSocket.instances).toHaveLength(3)
  })

  it.each([
    [4001, 'unauthorized'],
    [4003, 'forbidden'],
    [4004, 'not found'],
  ])('does not retry after close code %i', async (code, reason) => {
    const { result } = renderHook(() =>
      useIncidentChannel(INCIDENT, { socketFactory: factory }),
    )

    act(() => FakeSocket.instances[0]!.serverClose(code))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })

    // Retrying a rejected socket only burns battery and data.
    expect(FakeSocket.instances).toHaveLength(1)
    expect(result.current.closedReason).toBe(reason)
    expect(result.current.connected).toBe(false)
  })

  it('opens no socket when the app is running on the mock', () => {
    vi.stubEnv('VITE_API_URL', '')

    renderHook(() => useIncidentChannel(INCIDENT, { socketFactory: factory }))

    expect(FakeSocket.instances).toHaveLength(0)
  })

  it('closes the socket on unmount', () => {
    const { unmount } = renderHook(() =>
      useIncidentChannel(INCIDENT, { socketFactory: factory }),
    )

    unmount()

    expect(FakeSocket.instances[0]!.closed).toBe(true)
  })
})
