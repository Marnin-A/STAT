import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDashboardStream } from './useDashboardStream'

class FakeSource {
  static instances: FakeSource[] = []

  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  closed = false

  constructor(readonly url: string) {
    FakeSource.instances.push(this)
  }

  open() {
    this.onopen?.()
  }

  deliver(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent)
  }

  deliverRaw(data: string) {
    this.onmessage?.({ data } as MessageEvent)
  }

  close() {
    this.closed = true
  }
}

const factory = (url: string) => new FakeSource(url) as unknown as EventSource

describe('useDashboardStream', () => {
  beforeEach(() => {
    FakeSource.instances = []
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000')
  })

  afterEach(() => vi.unstubAllEnvs())

  it('subscribes to the dashboard feed', () => {
    renderHook(() => useDashboardStream({ sourceFactory: factory }))

    expect(FakeSource.instances[0]!.url).toBe('http://localhost:3000/dashboard/stream')
  })

  it('bumps a revision per event so the board can refetch', async () => {
    const onEvent = vi.fn()
    const { result } = renderHook(() => useDashboardStream({ sourceFactory: factory, onEvent }))
    const source = FakeSource.instances[0]!

    act(() => source.open())
    act(() => source.deliver({ eventId: 'e1', type: 'SOSAccepted' }))
    act(() => source.deliver({ eventId: 'e2', type: 'UnitAssigned' }))

    await waitFor(() => expect(result.current.revision).toBe(2))
    expect(result.current.latest?.eventId).toBe('e2')
    expect(result.current.connected).toBe(true)
    expect(onEvent).toHaveBeenCalledTimes(2)
  })

  it('survives a malformed frame', async () => {
    const { result } = renderHook(() => useDashboardStream({ sourceFactory: factory }))
    const source = FakeSource.instances[0]!

    act(() => source.open())
    act(() => source.deliverRaw('nonsense'))

    await waitFor(() => expect(result.current.revision).toBe(0))
    expect(result.current.connected).toBe(true)
  })

  it('marks itself disconnected on error', async () => {
    const { result } = renderHook(() => useDashboardStream({ sourceFactory: factory }))
    const source = FakeSource.instances[0]!

    act(() => source.open())
    act(() => source.onerror?.())

    await waitFor(() => expect(result.current.connected).toBe(false))
  })

  it('opens nothing when the app runs on the mock', () => {
    vi.stubEnv('VITE_API_URL', '')

    renderHook(() => useDashboardStream({ sourceFactory: factory }))

    expect(FakeSource.instances).toHaveLength(0)
  })

  it('closes the stream on unmount', () => {
    const { unmount } = renderHook(() => useDashboardStream({ sourceFactory: factory }))

    unmount()

    expect(FakeSource.instances[0]!.closed).toBe(true)
  })
})
