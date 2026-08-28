import { useState, useEffect } from 'react'
import { Preferences } from '@capacitor/preferences'

const DEVICE_ID_KEY = 'stat_device_id'

/**
 * Stable per-install id, generated once and kept in Preferences.
 *
 * The server keys SOS rate limits and abuse scoring on this, so it has to
 * survive app restarts. It is not a fingerprint and not an identity: clearing
 * app data mints a new one, which is the intended privacy trade (NDPA).
 */
export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    Preferences.get({ key: DEVICE_ID_KEY }).then(async ({ value }) => {
      if (cancelled) return
      if (value) {
        setDeviceId(value)
        return
      }
      const minted = crypto.randomUUID()
      await Preferences.set({ key: DEVICE_ID_KEY, value: minted })
      if (!cancelled) setDeviceId(minted)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return deviceId
}
