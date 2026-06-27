interface VitalCardProps {
  label: string
  value: string | number
  unit: string
  trend: 'up' | 'down' | 'flat'
  critical?: boolean
}

const trendIcons = {
  up: 'trending_up',
  down: 'trending_down',
  flat: 'trending_flat',
}

const trendColors = {
  up: 'text-primary',
  down: 'text-secondary',
  flat: 'text-on-surface-variant',
}

export function VitalCard({ label, value, unit, trend, critical = false }: VitalCardProps) {
  return (
    <div className={`p-4 bg-surface-container-lowest border-2 border-outline-variant rounded ${critical ? 'animate-flash-red' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{label}</span>
        <span className={`material-symbols-outlined text-lg ${trendColors[trend]}`}>
          {trendIcons[trend]}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-extrabold text-on-surface">{value}</span>
        <span className="text-sm text-on-surface-variant">{unit}</span>
      </div>
    </div>
  )
}
