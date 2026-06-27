import { useState } from 'react'
import { VitalCard } from '../components/ui/VitalCard'
import { ChatChannel } from '../components/ui/ChatChannel'
import { ActionButton } from '../components/ui/ActionButton'
import type { Vital, ChatMessage } from '@stat/shared'

const liveVitals: Vital[] = [
  { label: 'Heart Rate', value: 118, unit: 'bpm', trend: 'up', critical: true },
  { label: 'ST Elevation', value: '3.2mm', unit: 'leads', trend: 'up', critical: true },
  { label: 'SpO2', value: 96, unit: '%', trend: 'flat' },
  { label: 'Blood Pressure', value: '145/90', unit: 'mmHg', trend: 'up' },
]

const mockChat: ChatMessage[] = [
  { id: 'c1', incidentId: 'inc-h1', senderId: 'paramedic', senderName: 'Paramedic Okafor', message: 'STEMI confirmed. ETA 8 min. Patient conscious.', timestamp: new Date().toISOString(), isOwn: false },
  { id: 'c2', incidentId: 'inc-h1', senderId: 'hospital', senderName: 'Dr. Adeyemi', message: 'Cath lab prepped. Cardiology team on standby.', timestamp: new Date().toISOString(), isOwn: true },
  { id: 'c3', incidentId: 'inc-h1', senderId: 'paramedic', senderName: 'Paramedic Okafor', message: 'Administered 300mg aspirin. Vitals stable.', timestamp: new Date().toISOString(), isOwn: false },
]

const checklistItems = [
  'Cath lab prepared',
  'Cardiology team notified',
  'Defibrillator on standby',
  'Patient records pulled',
  'Bed assigned',
]

export function HospitalPreArrival() {
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [chatMessages, setChatMessages] = useState(mockChat)

  const toggleCheck = (index: number) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleSendChat = (message: string) => {
    setChatMessages(prev => [...prev, {
      id: `c-${Date.now()}`,
      incidentId: 'inc-h1',
      senderId: 'hospital',
      senderName: 'Dr. Adeyemi',
      message,
      timestamp: new Date().toISOString(),
      isOwn: true,
    }])
  }

  return (
    <div className="flex flex-col gap-6 px-[var(--spacing-margin-mobile)] py-6">
      <div className="p-4 bg-error-container border-2 border-primary rounded animate-flash-red">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-primary">monitor_heart</span>
          <span className="text-lg font-extrabold uppercase text-primary">STEMI Alert</span>
        </div>
        <p className="text-sm text-on-surface">Incoming cardiac patient — ETA 8 minutes</p>
      </div>

      <div>
        <h3 className="text-lg font-bold text-on-surface mb-3">Live Telemetry</h3>
        <div className="grid grid-cols-2 gap-3">
          {liveVitals.map((v) => (
            <VitalCard key={v.label} {...v} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-on-surface mb-3">Prep Checklist</h3>
        <div className="flex flex-col gap-2">
          {checklistItems.map((item, i) => (
            <button
              key={i}
              onClick={() => toggleCheck(i)}
              className={`flex items-center gap-3 p-3 border-2 rounded text-left transition-colors ${
                checked.has(i)
                  ? 'border-secondary bg-secondary-container text-on-secondary-container'
                  : 'border-outline-variant bg-surface-container-lowest text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-xl">
                {checked.has(i) ? 'check_box' : 'check_box_outline_blank'}
              </span>
              <span className="text-sm font-semibold">{item}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-on-surface mb-3">Coordination Chat</h3>
        <ChatChannel messages={chatMessages} onSend={handleSendChat} />
      </div>

      <ActionButton icon="local_hospital" className="w-full">
        Confirm Ready
      </ActionButton>
    </div>
  )
}
