import { useEffect, useRef } from 'react'
import type { Location } from '@stat/shared'

interface MapPlaceholderProps {
  center: Location
  eta?: string
  className?: string
}

export function MapPlaceholder({ center, eta, className = '' }: MapPlaceholderProps) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapRef.current) return
    // Leaflet will be initialized in Phase 3 for DispatchMap
    // For now, just show placeholder
  }, [center])

  return (
    <div
      data-testid="map-container"
      ref={mapRef}
      className={`relative bg-surface-container border-2 border-outline-variant rounded overflow-hidden ${className}`}
      style={{ minHeight: '200px' }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-2">map</span>
          <p className="text-sm text-on-surface-variant">
            {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </p>
        </div>
      </div>
      {eta && (
        <div className="absolute top-2 right-2 bg-primary text-on-primary px-3 py-1 rounded-full text-sm font-bold">
          ETA: {eta}
        </div>
      )}
    </div>
  )
}
