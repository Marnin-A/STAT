import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useApi } from '../api/ApiProvider'
import { VitalCard } from '../components/ui/VitalCard'
import { ProgressTracker } from '../components/ui/ProgressTracker'
import { ActionButton } from '../components/ui/ActionButton'
import { MapPlaceholder } from '../components/ui/MapPlaceholder'
import type { Incident, Vital } from '@stat/shared'

const mockVitals: Vital[] = [
  { label: 'Heart Rate', value: 0, unit: 'bpm', trend: 'flat', critical: true },
  { label: 'SpO2', value: 88, unit: '%', trend: 'down', critical: true },
  { label: 'Blood Pressure', value: '80/50', unit: 'mmHg', trend: 'down', critical: true },
  { label: 'Resp Rate', value: 8, unit: '/min', trend: 'down', critical: true },
  { label: 'Temp', value: 36.2, unit: '°C', trend: 'flat' },
  { label: 'GCS', value: 3, unit: '/15', trend: 'down', critical: true },
]

const statusToStep: Record<string, number> = {
  created: 0, triaging: 0, dispatched: 0, en_route: 1, on_scene: 2, transporting: 2, resolved: 2, cancelled: 0,
}

export function MedicalIncident() {
  const { id } = useParams<{ id: string }>()
  const api = useApi()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api.getIncident(id).then(setIncident)
  }, [id, api])

  const handleRunAI = async () => {
    if (!id) return
    const result = await api.submitTriageAnswers(id, [])
    setAiAnalysis(`Score: ${result.score} — ${result.level.toUpperCase()}. Flags: ${result.flags.join(', ')}. Recommend: ${result.recommendations.join(', ')}`)
  }

  if (!incident) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-[var(--spacing-margin-mobile)] py-6">
      <div>
        <h2 className="text-xl font-extrabold text-on-surface">Medical Incident</h2>
        <p className="text-sm text-on-surface-variant uppercase tracking-wider">
          #{incident.id.slice(0, 8)} — {incident.priority} — {incident.status}
        </p>
      </div>

      <ProgressTracker currentStep={statusToStep[incident.status] ?? 0} />

      <div className="p-4 bg-error-container border-2 border-primary rounded">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary">monitor_heart</span>
          <span className="text-sm font-bold uppercase text-primary">Cardiac Arrest</span>
        </div>
        <p className="text-sm text-on-surface">Patient unresponsive, no pulse detected. CPR in progress.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-on-surface">Vitals</h3>
          <span className="material-symbols-outlined text-primary animate-vitals-pulse">favorite</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {mockVitals.map((v) => (
            <VitalCard key={v.label} {...v} />
          ))}
        </div>
      </div>

      <MapPlaceholder center={incident.location} eta="3 min" className="h-40" />

      <div>
        <h3 className="text-lg font-bold text-on-surface mb-3">AI Triage Analysis</h3>
        <ActionButton onClick={handleRunAI} icon="psychology">
          Run AI Analysis
        </ActionButton>
        {aiAnalysis && (
          <div className="mt-3 p-3 bg-surface-container border-2 border-outline-variant rounded text-sm text-on-surface">
            {aiAnalysis}
          </div>
        )}
      </div>
    </div>
  )
}
