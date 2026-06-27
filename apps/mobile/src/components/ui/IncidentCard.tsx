import { Link } from 'react-router-dom'
import { StatusStrip } from './StatusStrip'
import type { Incident } from '@stat/shared'

interface IncidentCardProps {
  incident: Incident
  routePrefix?: string
}

const typeIcons: Record<string, string> = {
  medical: 'local_hospital',
  security: 'shield',
  fire: 'local_fire_department',
  hazard: 'warning',
}

const routeMap: Record<string, string> = {
  medical: '/triage/medical',
  security: '/dispatch',
  fire: '/dispatch/fire',
  hazard: '/triage',
}

export function IncidentCard({ incident, routePrefix }: IncidentCardProps) {
  const prefix = routePrefix ?? routeMap[incident.type] ?? '/triage'
  const to = `${prefix}/${incident.id}`
  const icon = typeIcons[incident.type] ?? 'emergency'

  return (
    <Link to={to} className="block">
      <StatusStrip priority={incident.priority}>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl text-primary">{icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold uppercase tracking-wider text-on-surface">
                {incident.type}
              </span>
              <span className="text-xs font-semibold uppercase text-on-surface-variant">
                {incident.status}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant truncate">
              {incident.location.address ?? `${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold uppercase text-primary">{incident.priority}</span>
              <span className="text-xs text-on-surface-variant">
                {incident.assignedUnitIds.length} unit{incident.assignedUnitIds.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
        </div>
      </StatusStrip>
    </Link>
  )
}
