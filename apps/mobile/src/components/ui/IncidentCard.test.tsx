import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { IncidentCard } from './IncidentCard'
import type { Incident } from '@stat/shared'

const mockIncident: Incident = {
  id: 'inc-001',
  agencyId: 'agency-medical',
  type: 'medical',
  priority: 'critical',
  status: 'dispatched',
  location: { lat: 6.5, lng: 3.4 },
  assignedUnitIds: ['unit-001'],
  hospitalId: null,
  hospitalAlerted: false,
  riskScore: 0,
  flagged: false,
  notes: [],
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('IncidentCard', () => {
  it('renders incident title and type', () => {
    render(
      <BrowserRouter>
        <IncidentCard incident={mockIncident} />
      </BrowserRouter>
    )
    expect(screen.getByText(/medical/i)).toBeInTheDocument()
    expect(screen.getByText(/critical/i)).toBeInTheDocument()
  })

  it('renders coordinates when the incident has a fix', () => {
    render(
      <BrowserRouter>
        <IncidentCard incident={mockIncident} />
      </BrowserRouter>
    )
    expect(screen.getByText(/6\.5000, 3\.4000/)).toBeInTheDocument()
  })

  it('renders status', () => {
    render(
      <BrowserRouter>
        <IncidentCard incident={mockIncident} />
      </BrowserRouter>
    )
    expect(screen.getByText(/dispatched/i)).toBeInTheDocument()
  })

  it('navigates to correct route on click', () => {
    render(
      <BrowserRouter>
        <IncidentCard incident={mockIncident} />
      </BrowserRouter>
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/triage/medical/inc-001')
  })

  it('renders an incident that has no GPS fix', () => {
    render(
      <BrowserRouter>
        <IncidentCard incident={{ ...mockIncident, location: null }} />
      </BrowserRouter>
    )
    expect(screen.getByText(/Location unavailable/i)).toBeInTheDocument()
  })
})
