import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../api/ApiProvider'
import { useGeolocation } from '../hooks/useGeolocation'
import { useHaptics } from '../hooks/useHaptics'
import { ActionButton } from '../components/ui/ActionButton'
import type { IncidentType } from '@stat/shared'

const emergencyTypes: { type: IncidentType; label: string; icon: string }[] = [
  { type: 'medical', label: 'Medical', icon: 'local_hospital' },
  { type: 'security', label: 'Security', icon: 'shield' },
  { type: 'fire', label: 'Fire', icon: 'local_fire_department' },
]

export function Dashboard() {
  const [selectedType, setSelectedType] = useState<IncidentType>('medical')
  const [submitting, setSubmitting] = useState(false)
  const api = useApi()
  const navigate = useNavigate()
  const { location, loading: gpsLoading, error: gpsError, getCurrentPosition } = useGeolocation()
  const { impactHeavy, notificationSuccess } = useHaptics()

  const handleSOS = async () => {
    setSubmitting(true)
    await impactHeavy()

    const loc = location ?? await getCurrentPosition()
    if (!loc) {
      setSubmitting(false)
      return
    }

    try {
      const idempotencyKey = crypto.randomUUID()
      const incident = await api.createIncident(
        { type: selectedType, location: loc },
        idempotencyKey
      )
      await notificationSuccess()
      navigate(`/triage/${incident.id}`)
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center px-[var(--spacing-margin-mobile)] py-8 gap-8">
      <div className="text-center">
        <h2 className="text-2xl font-extrabold text-on-surface mb-2">Emergency SOS</h2>
        <p className="text-sm text-on-surface-variant">Select emergency type and press SOS</p>
      </div>

      <div className="flex gap-4">
        {emergencyTypes.map((et) => (
          <button
            key={et.type}
            onClick={() => setSelectedType(et.type)}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
              selectedType === et.type
                ? 'border-primary bg-primary-container text-on-primary-container'
                : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline'
            }`}
          >
            <span className="material-symbols-outlined text-3xl">{et.icon}</span>
            <span className="text-xs font-bold uppercase">{et.label}</span>
          </button>
        ))}
      </div>

      <button
        onClick={handleSOS}
        disabled={submitting}
        className="animate-pulse-ring w-40 h-40 rounded-full bg-primary text-on-primary flex flex-col items-center justify-center gap-2 font-extrabold text-2xl uppercase tracking-wider disabled:opacity-50 disabled:animate-none hover:bg-primary-container transition-colors"
      >
        <span className="material-symbols-outlined text-5xl">sos</span>
        SOS
      </button>

      <div className="text-center">
        {gpsLoading && (
          <p className="text-sm text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-sm animate-spin">gps_fixed</span>
            Acquiring GPS...
          </p>
        )}
        {location && !gpsLoading && (
          <p className="text-sm text-secondary flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">location_on</span>
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </p>
        )}
        {gpsError && (
          <p className="text-sm text-error">{gpsError}</p>
        )}
      </div>

      <ActionButton
        onClick={getCurrentPosition}
        variant="secondary"
        icon="my_location"
        disabled={gpsLoading}
      >
        Get Location
      </ActionButton>
    </div>
  )
}
