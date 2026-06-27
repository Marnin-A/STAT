import { ReactNode } from 'react'

interface ActionButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  icon?: string
  disabled?: boolean
  className?: string
}

export function ActionButton({
  children,
  onClick,
  variant = 'primary',
  icon,
  disabled = false,
  className = '',
}: ActionButtonProps) {
  const baseClasses = 'touch-target flex items-center justify-center gap-2 px-6 rounded-lg font-bold text-base uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variantClasses = variant === 'primary'
    ? 'bg-primary text-on-primary hover:bg-primary-container'
    : 'bg-secondary text-on-secondary hover:bg-secondary-container'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {icon && <span className="material-symbols-outlined text-xl">{icon}</span>}
      {children}
    </button>
  )
}
