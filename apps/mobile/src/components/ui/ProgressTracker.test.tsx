import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressTracker } from './ProgressTracker'

describe('ProgressTracker', () => {
  it('renders 3 steps', () => {
    render(<ProgressTracker currentStep={0} />)
    expect(screen.getByText('Dispatched')).toBeInTheDocument()
    expect(screen.getByText('En Route')).toBeInTheDocument()
    expect(screen.getByText('Arriving')).toBeInTheDocument()
  })

  it('marks completed steps', () => {
    render(<ProgressTracker currentStep={2} />)
    const dispatchedSpan = screen.getByText('Dispatched')
    const enRouteSpan = screen.getByText('En Route')
    expect(dispatchedSpan).toHaveClass('text-primary')
    expect(enRouteSpan).toHaveClass('text-primary')
  })

  it('marks current step as active', () => {
    render(<ProgressTracker currentStep={1} />)
    const enRouteSpan = screen.getByText('En Route')
    expect(enRouteSpan).toHaveClass('text-primary')
  })

  it('marks future steps as inactive', () => {
    render(<ProgressTracker currentStep={0} />)
    const arrivingSpan = screen.getByText('Arriving')
    expect(arrivingSpan).toHaveClass('text-on-surface-variant')
  })
})
