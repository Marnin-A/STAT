import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { HospitalPreArrival } from './HospitalPreArrival'

describe('HospitalPreArrival', () => {
  it('renders STEMI alert', () => {
    render(<BrowserRouter><HospitalPreArrival /></BrowserRouter>)
    expect(screen.getByText(/STEMI Alert/i)).toBeInTheDocument()
  })

  it('renders live vitals', () => {
    render(<BrowserRouter><HospitalPreArrival /></BrowserRouter>)
    expect(screen.getByText('118')).toBeInTheDocument()
    expect(screen.getByText('3.2mm')).toBeInTheDocument()
  })

  it('renders prep checklist', () => {
    render(<BrowserRouter><HospitalPreArrival /></BrowserRouter>)
    expect(screen.getByText('Cath lab prepared')).toBeInTheDocument()
    expect(screen.getByText('Cardiology team notified')).toBeInTheDocument()
  })

  it('toggles checklist items', async () => {
    render(<BrowserRouter><HospitalPreArrival /></BrowserRouter>)
    const item = screen.getByText('Cath lab prepared')
    await userEvent.click(item)
    const checkbox = screen.getAllByText('check_box')[0]
    expect(checkbox).toBeInTheDocument()
  })

  it('renders chat messages', () => {
    render(<BrowserRouter><HospitalPreArrival /></BrowserRouter>)
    expect(screen.getByText(/STEMI confirmed/i)).toBeInTheDocument()
    expect(screen.getByText(/Cath lab prepped/i)).toBeInTheDocument()
  })
})
