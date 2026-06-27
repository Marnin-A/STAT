import { useState, useEffect } from 'react'
import { useApi } from '../api/ApiProvider'
import { IncidentCard } from '../components/ui/IncidentCard'
import type { Incident, IncidentType } from '@stat/shared'

const filters: { label: string; value: IncidentType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Medical', value: 'medical' },
  { label: 'Fire', value: 'fire' },
  { label: 'Security', value: 'security' },
]

export function TriageList() {
  const api = useApi()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [activeFilter, setActiveFilter] = useState<IncidentType | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.listIncidents(activeFilter === 'all' ? {} : { type: activeFilter })
      .then(setIncidents)
      .finally(() => setLoading(false))
  }, [activeFilter, api])

  return (
    <div className="flex flex-col gap-4 px-[var(--spacing-margin-mobile)] py-6">
      <div>
        <h2 className="text-xl font-extrabold text-on-surface">Active Emergencies</h2>
        <p className="text-sm text-on-surface-variant">{incidents.length} incident{incidents.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-bold uppercase whitespace-nowrap transition-colors ${
              activeFilter === f.value
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
          <p className="text-sm">No active emergencies</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {incidents.map((inc) => (
            <IncidentCard key={inc.id} incident={inc} />
          ))}
        </div>
      )}
    </div>
  )
}
