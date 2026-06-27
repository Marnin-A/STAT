interface BentoCardProps {
  title: string
  value: string | number
  icon?: string
  subtitle?: string
  critical?: boolean
  className?: string
}

export function BentoCard({ title, value, icon, subtitle, critical = false, className = '' }: BentoCardProps) {
  return (
    <div className={`p-4 bg-surface-container-lowest border-2 border-outline-variant rounded ${critical ? 'border-primary animate-flash-red' : ''} ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="material-symbols-outlined text-lg text-on-surface-variant">{icon}</span>}
        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{title}</span>
      </div>
      <p className={`text-2xl font-extrabold ${critical ? 'text-primary' : 'text-on-surface'}`}>{value}</p>
      {subtitle && <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>}
    </div>
  )
}
