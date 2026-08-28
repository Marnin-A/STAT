import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ApiClient, ReplayResult } from '@stat/shared'
import { ApiProvider } from '../../api/ApiProvider'
import { OfflineBanner } from './OfflineBanner'

let stored: string | null = null

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: stored })),
    set: vi.fn(async ({ value }: { value: string }) => {
      stored = value
    }),
  },
}))

function queued(count: number) {
  stored = JSON.stringify(
    Array.from({ length: count }, (_, i) => ({
      id: `m${i}`,
      incidentId: 'inc-1',
      kind: 'status',
      payload: { status: 'en_route' },
      key: `k${i}`,
      occurredAt: '2026-08-28T10:0${i}:00.000Z',
    })),
  )
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true })
}

function renderBanner(replay?: ApiClient['replay']) {
  const client = {
    replay: replay ?? (async () => [] as ReplayResult[]),
  } as unknown as ApiClient
  return render(
    <ApiProvider client={client}>
      <OfflineBanner />
    </ApiProvider>,
  )
}

describe('OfflineBanner', () => {
  beforeEach(() => {
    stored = null
    setOnline(true)
    vi.clearAllMocks()
  })

  it('stays out of the way when online with nothing queued', async () => {
    renderBanner()

    await waitFor(() => {
      expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument()
    })
  })

  it('says what is saved on the phone while offline', async () => {
    setOnline(false)
    queued(3)

    renderBanner()

    // "Saved on this phone" is the distinction that matters mid-response.
    expect(await screen.findByText(/3 saved on this phone/i)).toBeInTheDocument()
  })

  it('drains the queue when the connection returns', async () => {
    setOnline(false)
    queued(2)
    const replay = vi.fn(async (_id: string, commands: { key: string }[]) =>
      commands.map((c) => ({ key: c.key, applied: true, error: null })),
    )

    renderBanner(replay as ApiClient['replay'])
    await screen.findByText(/2 saved on this phone/i)

    setOnline(true)
    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })

    await waitFor(() => expect(replay).toHaveBeenCalledTimes(1))
    await waitFor(() => {
      expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument()
    })
  })

  it('reports commands dispatch rejected', async () => {
    queued(1)
    const replay = vi.fn(async (_id: string, commands: { key: string }[]) =>
      commands.map((c) => ({ key: c.key, applied: false, error: 'INVALID_TRANSITION' })),
    )

    renderBanner(replay as ApiClient['replay'])

    expect(await screen.findByText(/1 rejected by dispatch/i)).toBeInTheDocument()
  })
})
