import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useApi } from '../api/ApiProvider'
import type { Unit } from '@stat/shared'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const unitIcon = new L.DivIcon({
  html: '<span class="material-symbols-outlined" style="color:#3755c3;font-size:28px;">pin_drop</span>',
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

const incidentIcon = new L.DivIcon({
  html: '<span class="material-symbols-outlined" style="color:#b80035;font-size:32px;">warning</span>',
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
})

const LAGOS_CENTER: [number, number] = [6.5244, 3.3792]

export function DispatchMap() {
  const api = useApi()
  const [units, setUnits] = useState<Unit[]>([])

  useEffect(() => {
    api.getAvailableUnits().then(setUnits)
  }, [api])

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="px-[var(--spacing-margin-mobile)] py-3 bg-surface-container-lowest border-b-2 border-outline-variant">
        <h2 className="text-xl font-extrabold text-on-surface">Dispatch Map</h2>
        <p className="text-sm text-on-surface-variant">{units.length} unit{units.length !== 1 ? 's' : ''} tracked</p>
      </div>
      <div className="flex-1">
        <MapContainer
          center={LAGOS_CENTER}
          zoom={12}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={LAGOS_CENTER} icon={incidentIcon}>
            <Popup>Active Incident Zone</Popup>
          </Marker>
          {units.map((unit) => (
            <Marker
              key={unit.id}
              position={[unit.location.lat, unit.location.lng]}
              icon={unitIcon}
            >
              <Popup>
                <strong>{unit.callSign}</strong><br />
                {unit.type} — {unit.status}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
