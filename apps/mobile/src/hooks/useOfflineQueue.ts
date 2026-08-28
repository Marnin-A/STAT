import { useState, useCallback, useEffect, useRef } from 'react'
import { Preferences } from '@capacitor/preferences'
import { ApiError, NetworkError, type ApiClient, type ReplayCommand } from '@stat/shared'

/**
 * A mutation a responder made while offline.
 *
 * `key` and `occurredAt` are stamped at capture time, not at drain time: the
 * server orders the batch by `occurredAt` and dedupes by `key`, so a queue
 * drained twice produces one result, and actions replay in the order they
 * actually happened rather than the order the network recovered.
 */
export interface QueuedMutation {
  id: string
  incidentId: string
  kind: ReplayCommand['kind']
  payload: Record<string, unknown>
  key: string
  occurredAt: string
}

/** What a drain did, for the UI to report and for tests to assert on. */
export interface DrainResult {
  applied: number
  /** Commands the server rejected on merit. Removed from the queue. */
  rejected: Array<{ mutation: QueuedMutation; error: string }>
  /** Still queued: the network never carried them. */
  pending: number
}

interface UseOfflineQueueResult {
  queue: QueuedMutation[]
  /** True once the stored queue has been read. Guards a premature drain. */
  ready: boolean
  enqueue: (
    incidentId: string,
    kind: ReplayCommand['kind'],
    payload: Record<string, unknown>,
  ) => Promise<void>
  drain: (api: ApiClient) => Promise<DrainResult>
  clear: () => Promise<void>
}

const QUEUE_KEY = 'stat_offline_queue'

export function useOfflineQueue(): UseOfflineQueueResult {
  const [queue, setQueue] = useState<QueuedMutation[]>([])
  const [ready, setReady] = useState(false)

  // The drain reads the queue through a ref so it never captures a stale copy
  // between renders — a responder can be enqueueing while a drain is running.
  const queueRef = useRef<QueuedMutation[]>([])
  queueRef.current = queue

  useEffect(() => {
    Preferences.get({ key: QUEUE_KEY })
      .then(({ value }) => {
        if (value) setQueue(JSON.parse(value) as QueuedMutation[])
      })
      .finally(() => setReady(true))
  }, [])

  const persist = useCallback(async (items: QueuedMutation[]) => {
    await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(items) })
    queueRef.current = items
    setQueue(items)
  }, [])

  const enqueue = useCallback(
    async (
      incidentId: string,
      kind: ReplayCommand['kind'],
      payload: Record<string, unknown>,
    ) => {
      const mutation: QueuedMutation = {
        id: crypto.randomUUID(),
        incidentId,
        kind,
        payload,
        // Stamped now. The server replays in this order, not arrival order.
        key: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
      }
      await persist([...queueRef.current, mutation])
    },
    [persist],
  )

  /**
   * Send everything queued through `POST /incidents/:id/replay`, one batch per
   * incident.
   *
   * The two failure modes are handled differently on purpose:
   *
   *  - `NetworkError` — the request never landed. Keep the batch queued and
   *    try again later.
   *  - `ApiError` — the server answered. The commands are spent; dropping them
   *    is correct, and re-sending would be a retry of something already
   *    decided.
   *
   * Per-command rejections come back inside a successful response and are
   * reported to the caller so a dispatcher can be told, rather than vanishing.
   */
  const drain = useCallback(
    async (api: ApiClient): Promise<DrainResult> => {
      const pending = queueRef.current
      if (pending.length === 0) return { applied: 0, rejected: [], pending: 0 }

      const byIncident = new Map<string, QueuedMutation[]>()
      for (const mutation of pending) {
        byIncident.set(mutation.incidentId, [
          ...(byIncident.get(mutation.incidentId) ?? []),
          mutation,
        ])
      }

      let applied = 0
      const rejected: DrainResult['rejected'] = []
      const stillQueued: QueuedMutation[] = []

      for (const [incidentId, mutations] of byIncident) {
        const commands: ReplayCommand[] = mutations.map((m) => ({
          key: m.key,
          kind: m.kind,
          occurredAt: m.occurredAt,
          payload: m.payload,
        }))

        try {
          const results = await api.replay(incidentId, commands)
          const byKey = new Map(results.map((r) => [r.key, r]))

          for (const mutation of mutations) {
            const result = byKey.get(mutation.key)
            if (!result || result.applied) {
              applied += 1
            } else if (result.error) {
              // Rejected on merit — the dispatcher needs to know, but resending
              // it would just be rejected again.
              rejected.push({ mutation, error: result.error })
            } else {
              // Already applied on an earlier drain. Not an error.
              applied += 1
            }
          }
        } catch (err) {
          if (err instanceof NetworkError) {
            stillQueued.push(...mutations) // never arrived; try again later
          } else if (err instanceof ApiError) {
            rejected.push(...mutations.map((mutation) => ({ mutation, error: err.code })))
          } else {
            stillQueued.push(...mutations)
          }
        }
      }

      await persist(stillQueued)
      return { applied, rejected, pending: stillQueued.length }
    },
    [persist],
  )

  const clear = useCallback(async () => {
    await persist([])
  }, [persist])

  return { queue, ready, enqueue, drain, clear }
}
