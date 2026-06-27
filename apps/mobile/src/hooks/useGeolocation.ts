import { useState, useCallback } from 'react'
import { Geolocation } from '@capacitor/geolocation'
import type { Location } from '@stat/shared'

interface UseGeolocationResult {
  location: Location | null
  loading: boolean
  error: string | null
  getCurrentPosition: () => Promise<Location | null>
}

export function useGeolocation(): UseGeolocationResult {
  const [location, setLocation] = useState<Location | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getCurrentPosition = useCallback(async (): Promise<Location | null> => {
    setLoading(true)
    setError(null)
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      })
      const loc: Location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }
      setLocation(loc)
      setLoading(false)
      return loc
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get location'
      setError(message)
      setLoading(false)
      return null
    }
  }, [])

  return { location, loading, error, getCurrentPosition }
}
