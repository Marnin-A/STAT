import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { BottomNavBar } from './BottomNavBar'

describe('BottomNavBar', () => {
  it('renders 4 navigation items', () => {
    render(
      <BrowserRouter>
        <BottomNavBar />
      </BrowserRouter>
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Triage')).toBeInTheDocument()
    expect(screen.getByText('Dispatch')).toBeInTheDocument()
    expect(screen.getByText('Hospital')).toBeInTheDocument()
  })

  it('applies safe-area-bottom padding', () => {
    render(
      <BrowserRouter>
        <BottomNavBar />
      </BrowserRouter>
    )
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('safe-area-bottom')
  })

  it('links to correct routes', () => {
    render(
      <BrowserRouter>
        <BottomNavBar />
      </BrowserRouter>
    )
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /triage/i })).toHaveAttribute('href', '/triage')
    expect(screen.getByRole('link', { name: /dispatch/i })).toHaveAttribute('href', '/dispatch/map')
    expect(screen.getByRole('link', { name: /hospital/i })).toHaveAttribute('href', '/hospital')
  })
})
