import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { VitalCard } from './VitalCard'

describe('VitalCard', () => {
  it('renders label and value', () => {
    render(<VitalCard label="Heart Rate" value={72} unit="bpm" trend="flat" />)
    expect(screen.getByText('Heart Rate')).toBeInTheDocument()
    expect(screen.getByText('72')).toBeInTheDocument()
    expect(screen.getByText('bpm')).toBeInTheDocument()
  })

  it('renders up trend arrow', () => {
    render(<VitalCard label="HR" value={80} unit="bpm" trend="up" />)
    expect(screen.getByText('trending_up')).toBeInTheDocument()
  })

  it('renders down trend arrow', () => {
    render(<VitalCard label="HR" value={60} unit="bpm" trend="down" />)
    expect(screen.getByText('trending_down')).toBeInTheDocument()
  })

  it('renders flat trend arrow', () => {
    render(<VitalCard label="HR" value={72} unit="bpm" trend="flat" />)
    expect(screen.getByText('trending_flat')).toBeInTheDocument()
  })

  it('applies critical styling when critical', () => {
    const { container } = render(<VitalCard label="HR" value={180} unit="bpm" trend="up" critical />)
    expect(container.firstChild).toHaveClass('animate-flash-red')
  })
})
