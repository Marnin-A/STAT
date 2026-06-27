import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BentoCard } from './BentoCard'

describe('BentoCard', () => {
  it('renders title and value', () => {
    render(<BentoCard title="Threat Level" value="HIGH" />)
    expect(screen.getByText('Threat Level')).toBeInTheDocument()
    expect(screen.getByText('HIGH')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(<BentoCard title="Suspects" value="3" icon="group" />)
    expect(screen.getByText('group')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<BentoCard title="ETA" value="4 min" subtitle="Unit 14" />)
    expect(screen.getByText('Unit 14')).toBeInTheDocument()
  })
})
