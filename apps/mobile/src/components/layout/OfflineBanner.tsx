import { useState, useEffect, useCallback } from 'react'
import { useApi } from '../../api/ApiProvider'
import { useOfflineQueue } from '../../hooks/useOfflineQueue'

/**
 * Connectivity and queue state, on every screen.
 *
 * A responder working a live incident has to be able to tell "sent" from
 * "saved on this phone" at a glance. Silence is the dangerous state: without
 * this, a queued status change looks exactly like a delivered one.
 *
 * Draining is triggered by the browser coming back online, which Capacitor
 * surfaces from the native network stack on Android.
 */
export function OfflineBanner() {
  const api = useApi()
  const { queue, ready, drain } = useOfflineQueue()
  const [online, setOnline] = useState(() => navigator.onLine)
  const [draining, setDraining] = useState(false)
  const [rejected, setRejected] = useState(0)

  const flush = useCallback(async () => {
    if (!ready || draining) return
    setDraining(true)
    try {
      const result = await drain(api)
      // Rejections are surfaced, never swallowed: a command the server refused
      // is work the responder believes happened.
      if (result.rejected.length) setRejected((n) => n + result.rejected.length)
    } finally {
      setDraining(false)
    }
  }, [api, drain, draining, ready])

  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      void flush()
    }
    const goOffline = () => setOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [flush])

  // Drain whatever survived a restart, once the stored queue has been read.
  useEffect(() => {
    if (ready && online && queue.length > 0) void flush()
    // Deliberately not depending on `flush`: this runs on readiness and
    // connectivity, not on every render that rebuilds the callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, online])

  if (online && queue.length === 0 && rejected === 0) return null

  return (
    <div
      role="status"
      data-testid="offline-banner"
      className={`px-[var(--spacing-margin-mobile)] py-2 border-b-2 text-sm font-bold flex items-center gap-2 ${
        online
          ? 'bg-secondary-container text-on-secondary-container border-secondary'
          : 'bg-error-container text-on-error-container border-error'
      }`}
    >
      <span className="material-symbols-outlined text-lg" aria-hidden="true">
        {online ? 'cloud_sync' : 'cloud_off'}
      </span>
      <span>
        {!online && 'Offline'}
        {!online && queue.length > 0 && ` — ${queue.length} saved on this phone`}
        {online && draining && 'Syncing…'}
        {online && !draining && queue.length > 0 && `${queue.length} waiting to sync`}
        {online && !draining && queue.length === 0 && rejected > 0 && `${rejected} rejected by dispatch`}
      </span>
    </div>
  )
}
