import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOfflineQueue } from './useOfflineQueue'

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('useOfflineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with empty queue', () => {
    const { result } = renderHook(() => useOfflineQueue())
    expect(result.current.queue).toEqual([])
  })

  it('enqueues a mutation', async () => {
    const { result } = renderHook(() => useOfflineQueue())
    await act(async () => {
      await result.current.enqueue('/incidents', 'POST', { type: 'medical' })
    })
    expect(result.current.queue).toHaveLength(1)
    expect(result.current.queue[0].endpoint).toBe('/incidents')
  })

  it('clears queue', async () => {
    const { result } = renderHook(() => useOfflineQueue())
    await act(async () => {
      await result.current.enqueue('/incidents', 'POST', { type: 'medical' })
    })
    await act(async () => {
      await result.current.clear()
    })
    expect(result.current.queue).toEqual([])
  })
})
