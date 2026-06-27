import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useApi } from '../api/ApiProvider'
import { ProgressTracker } from '../components/ui/ProgressTracker'
import { VitalCard } from '../components/ui/VitalCard'
import { MapPlaceholder } from '../components/ui/MapPlaceholder'
import { ActionButton } from '../components/ui/ActionButton'
import type { Incident, Triage, TriageAnswer, Vital } from '@stat/shared'

const statusToStep: Record<string, number> = {
  created: 0,
  triaging: 0,
  dispatched: 0,
  en_route: 1,
  on_scene: 2,
  transporting: 2,
  resolved: 2,
  cancelled: 0,
}

const mockVitals: Vital[] = [
  { label: 'Heart Rate', value: 112, unit: 'bpm', trend: 'up', critical: true },
  { label: 'SpO2', value: 94, unit: '%', trend: 'down', critical: true },
  { label: 'Blood Pressure', value: '90/60', unit: 'mmHg', trend: 'down' },
  { label: 'Resp Rate', value: 24, unit: '/min', trend: 'up' },
]

export function TriageTracking() {
  const { id } = useParams<{ id: string }>()
  const api = useApi()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [triage, setTriage] = useState<Triage | null>(null)
  const [answers, setAnswers] = useState<TriageAnswer[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [score, setScore] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api.getIncident(id).then(setIncident)
    api.getTriage(id).then(setTriage)
  }, [id, api])

  const handleAnswer = (questionId: string, value: string | boolean) => {
    setAnswers(prev => {
      const existing = prev.findIndex(a => a.questionId === questionId)
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = { questionId, value }
        return next
      }
      return [...prev, { questionId, value }]
    })
  }

  const handleSubmitTriage = async () => {
    if (!id) return
    setSubmitting(true)
    try {
      const result = await api.submitTriageAnswers(id, answers)
      setScore(`Score: ${result.score} — ${result.level.toUpperCase()}`)
    } catch {
      setScore('Failed to submit triage')
    }
    setSubmitting(false)
  }

  if (!incident) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
      </div>
    )
  }

  const currentStep = statusToStep[incident.status] ?? 0

  return (
    <div className="flex flex-col gap-6 px-[var(--spacing-margin-mobile)] py-6">
      <div>
        <h2 className="text-xl font-extrabold text-on-surface mb-1">Incident #{incident.id.slice(0, 8)}</h2>
        <p className="text-sm text-on-surface-variant uppercase tracking-wider">
          {incident.type} — {incident.priority} — {incident.status}
        </p>
      </div>

      <ProgressTracker currentStep={currentStep} />

      <MapPlaceholder center={incident.location} eta="5 min" className="h-48" />

      <div>
        <h3 className="text-lg font-bold text-on-surface mb-3">AI Triage</h3>
        {triage?.questions.map((q) => (
          <div key={q.id} className="mb-4 p-4 bg-surface-container-lowest border-2 border-outline-variant rounded">
            <p className="text-sm font-semibold text-on-surface mb-2">{q.text}</p>
            {q.type === 'yes_no' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAnswer(q.id, true)}
                  className={`flex-1 py-2 rounded font-bold text-sm ${
                    answers.find(a => a.questionId === q.id)?.value === true
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => handleAnswer(q.id, false)}
                  className={`flex-1 py-2 rounded font-bold text-sm ${
                    answers.find(a => a.questionId === q.id)?.value === false
                      ? 'bg-secondary text-on-secondary'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  No
                </button>
              </div>
            )}
            {q.type === 'text' && (
              <textarea
                onChange={(e) => handleAnswer(q.id, e.target.value)}
                className="w-full p-2 border-2 border-outline-variant rounded text-sm"
                rows={2}
                placeholder="Describe..."
              />
            )}
          </div>
        ))}
        <ActionButton onClick={handleSubmitTriage} disabled={submitting || answers.length === 0}>
          Submit Triage
        </ActionButton>
        {score && (
          <p className="mt-3 text-sm font-bold text-primary">{score}</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-on-surface mb-3">Vitals</h3>
        <div className="grid grid-cols-2 gap-3">
          {mockVitals.map((v) => (
            <VitalCard key={v.label} {...v} />
          ))}
        </div>
      </div>
    </div>
  )
}
