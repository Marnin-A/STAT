import { useState, useCallback, useEffect } from 'react'
import { Preferences } from '@capacitor/preferences'

interface QueuedMutation {
  id: string
  endpoint: string
  method: string
  body: string
  timestamp: string
}

const QUEUE_KEY = 'stat_offline_queue'

interface UseOfflineQueueResult {
  queue: QueuedMutation[]
  enqueue: (endpoint: string, method: string, body: unknown) => Promise<void>
  replay: (executor: (mutation: QueuedMutation) => Promise<boolean>) => Promise<number>
  clear: () => Promise<void>
}

export function useOfflineQueue(): UseOfflineQueueResult {
  const [queue, setQueue] = useState<QueuedMutation[]>([])

  useEffect(() => {
    Preferences.get({ key: QUEUE_KEY }).then(({ value }) => {
      if (value) setQueue(JSON.parse(value))
    })
  }, [])

  const persist = useCallback(async (items: QueuedMutation[]) => {
    await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(items) })
    setQueue(items)
  }, [])

  const enqueue = useCallback(async (endpoint: string, method: string, body: unknown) => {
    const mutation: QueuedMutation = {
      id: crypto.randomUUID(),
      endpoint,
      method,
      body: JSON.stringify(body),
      timestamp: new Date().toISOString(),
    }
    const next = [...queue, mutation]
    await persist(next)
  }, [queue, persist])

  const replay = useCallback(async (executor: (mutation: QueuedMutation) => Promise<boolean>): Promise<number> => {
    let replayed = 0
    const remaining: QueuedMutation[] = []
    for (const mutation of queue) {
      const success = await executor(mutation)
      if (success) replayed++
      else remaining.push(mutation)
    }
    await persist(remaining)
    return replayed
  }, [queue, persist])

  const clear = useCallback(async () => {
    await persist([])
  }, [persist])

  return { queue, enqueue, replay, clear }
}
