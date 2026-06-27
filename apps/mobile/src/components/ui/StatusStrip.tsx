import { ReactNode } from 'react'
import type { Priority } from '@stat/shared'

interface StatusStripProps {
  priority: Priority
  children: ReactNode
  className?: string
}

export function StatusStrip({ priority, children, className = '' }: StatusStripProps) {
  const stripClass = priority === 'critical'
    ? 'status-strip-critical'
    : priority === 'serious'
    ? 'status-strip-serious'
    : 'status-strip-stable'

  return (
    <div className={`${stripClass} pl-4 py-3 bg-surface-container-lowest border-2 border-outline-variant rounded ${className}`}>
      {children}
    </div>
  )
}
