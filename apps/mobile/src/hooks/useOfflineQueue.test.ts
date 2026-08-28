import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiError, NetworkError, type ApiClient, type ReplayResult } from '@stat/shared'
import { useOfflineQueue, type QueuedMutation } from './useOfflineQueue'

let stored: string | null = null

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: stored })),
    set: vi.fn(async ({ value }: { value: string }) => {
      stored = value
    }),
  },
}))

/** Minimal ApiClient: only `replay` is exercised by the queue. */
function apiWithReplay(replay: ApiClient['replay']): ApiClient {
  return { replay } as unknown as ApiClient
}

function ok(keys: string[]): ReplayResult[] {
  return keys.map((key) => ({ key, applied: true, error: null }))
}

async function mountReady() {
  const hook = renderHook(() => useOfflineQueue())
  await waitFor(() => expect(hook.result.current.ready).toBe(true))
  return hook
}

describe('useOfflineQueue', () => {
  beforeEach(() => {
    stored = null
    vi.clearAllMocks()
  })

  it('starts empty', async () => {
    const { result } = await mountReady()

    expect(result.current.queue).toEqual([])
  })

  it('stamps a key and capture time when a mutation is queued', async () => {
    const { result } = await mountReady()

    await act(async () => {
      await result.current.enqueue('inc-1', 'status', { status: 'en_route' })
    })

    const [queued] = result.current.queue as [QueuedMutation]
    expect(queued.incidentId).toBe('inc-1')
    expect(queued.kind).toBe('status')
    expect(queued.key).toBeTruthy()
    // Capture time, not drain time — the server replays in this order.
    expect(Date.parse(queued.occurredAt)).not.toBeNaN()
  })

  it('survives a restart', async () => {
    const first = await mountReady()
    await act(async () => {
      await first.result.current.enqueue('inc-1', 'note', { text: 'Airway clear' })
    })

    // Remount: a responder's phone died and came back mid-incident.
    const second = await mountReady()

    expect(second.result.current.queue).toHaveLength(1)
    expect(second.result.current.queue[0]!.payload).toEqual({ text: 'Airway clear' })
  })

  it('drains through the replay endpoint and empties the queue', async () => {
    const replay = vi.fn(async (_id: string, commands: { key: string }[]) =>
      ok(commands.map((c) => c.key)),
    )
    const { result } = await mountReady()

    await act(async () => {
      await result.current.enqueue('inc-1', 'status', { status: 'en_route' })
      await result.current.enqueue('inc-1', 'note', { text: 'On scene' })
    })

    let outcome!: Awaited<ReturnType<typeof result.current.drain>>
    await act(async () => {
      outcome = await result.current.drain(apiWithReplay(replay as ApiClient['replay']))
    })

    expect(replay).toHaveBeenCalledTimes(1)
    expect(replay.mock.calls[0]![1]).toHaveLength(2)
    expect(outcome.applied).toBe(2)
    expect(outcome.pending).toBe(0)
    expect(result.current.queue).toEqual([])
  })

  it('batches per incident', async () => {
    const replay = vi.fn(async (_id: string, commands: { key: string }[]) =>
      ok(commands.map((c) => c.key)),
    )
    const { result } = await mountReady()

    await act(async () => {
      await result.current.enqueue('inc-1', 'status', { status: 'en_route' })
      await result.current.enqueue('inc-2', 'status', { status: 'on_scene' })
    })

    await act(async () => {
      await result.current.drain(apiWithReplay(replay as ApiClient['replay']))
    })

    expect(replay).toHaveBeenCalledTimes(2)
    expect(replay.mock.calls.map((c) => c[0]).sort()).toEqual(['inc-1', 'inc-2'])
  })

  it('keeps everything queued when the request never lands', async () => {
    const replay = vi.fn(async () => {
      throw new NetworkError(new Error('offline'))
    })
    const { result } = await mountReady()

    await act(async () => {
      await result.current.enqueue('inc-1', 'status', { status: 'en_route' })
    })

    let outcome!: Awaited<ReturnType<typeof result.current.drain>>
    await act(async () => {
      outcome = await result.current.drain(apiWithReplay(replay as unknown as ApiClient['replay']))
    })

    // Still in the tunnel. Nothing is lost and nothing is double-counted.
    expect(outcome.applied).toBe(0)
    expect(outcome.pending).toBe(1)
    expect(result.current.queue).toHaveLength(1)
  })

  it('drops commands the server rejected on merit, and reports them', async () => {
    const replay = vi.fn(async (_id: string, commands: { key: string }[]) =>
      commands.map((c) => ({ key: c.key, applied: false, error: 'INVALID_TRANSITION' })),
    )
    const { result } = await mountReady()

    await act(async () => {
      await result.current.enqueue('inc-1', 'status', { status: 'dispatched' })
    })

    let outcome!: Awaited<ReturnType<typeof result.current.drain>>
    await act(async () => {
      outcome = await result.current.drain(apiWithReplay(replay as ApiClient['replay']))
    })

    // Resending would just be rejected again — but a dispatcher must be told.
    expect(outcome.rejected).toHaveLength(1)
    expect(outcome.rejected[0]!.error).toBe('INVALID_TRANSITION')
    expect(result.current.queue).toEqual([])
  })

  it('does not requeue after the server rejects the whole batch', async () => {
    const replay = vi.fn(async () => {
      throw new ApiError(403, 'FORBIDDEN', 'agency scope')
    })
    const { result } = await mountReady()

    await act(async () => {
      await result.current.enqueue('inc-1', 'status', { status: 'en_route' })
    })

    let outcome!: Awaited<ReturnType<typeof result.current.drain>>
    await act(async () => {
      outcome = await result.current.drain(apiWithReplay(replay as unknown as ApiClient['replay']))
    })

    expect(outcome.rejected[0]!.error).toBe('FORBIDDEN')
    expect(result.current.queue).toEqual([])
  })

  it('replays a second time without duplicating anything', async () => {
    const seen = new Set<string>()
    const replay = vi.fn(async (_id: string, commands: { key: string }[]) =>
      commands.map((c) => {
        const duplicate = seen.has(c.key)
        seen.add(c.key)
        // The server dedupes by key: a repeat is reported as not applied.
        return { key: c.key, applied: !duplicate, error: null }
      }),
    )
    const { result } = await mountReady()

    await act(async () => {
      await result.current.enqueue('inc-1', 'status', { status: 'en_route' })
    })

    const client = apiWithReplay(replay as ApiClient['replay'])
    await act(async () => {
      await result.current.drain(client)
    })

    // The queue is empty, so a second drain is a no-op — but even if the same
    // batch were resent, the keys make it idempotent.
    await act(async () => {
      await result.current.drain(client)
    })

    expect(replay).toHaveBeenCalledTimes(1)
    expect(result.current.queue).toEqual([])
  })

  it('is a no-op when there is nothing queued', async () => {
    const replay = vi.fn()
    const { result } = await mountReady()

    let outcome!: Awaited<ReturnType<typeof result.current.drain>>
    await act(async () => {
      outcome = await result.current.drain(apiWithReplay(replay as unknown as ApiClient['replay']))
    })

    expect(replay).not.toHaveBeenCalled()
    expect(outcome).toEqual({ applied: 0, rejected: [], pending: 0 })
  })

  it('clears the queue', async () => {
    const { result } = await mountReady()

    await act(async () => {
      await result.current.enqueue('inc-1', 'status', { status: 'en_route' })
    })
    await act(async () => {
      await result.current.clear()
    })

    expect(result.current.queue).toEqual([])
  })
})
