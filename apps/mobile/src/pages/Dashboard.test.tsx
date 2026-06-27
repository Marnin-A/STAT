import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { Dashboard } from './Dashboard'
import { ApiProvider } from '../api/ApiProvider'

vi.mock('../hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    location: { lat: 6.5, lng: 3.4 },
    loading: false,
    error: null,
    getCurrentPosition: vi.fn(),
  }),
}))

vi.mock('../hooks/useHaptics', () => ({
  useHaptics: () => ({
    impactLight: vi.fn(),
    impactMedium: vi.fn(),
    impactHeavy: vi.fn(),
    notificationSuccess: vi.fn(),
    notificationWarning: vi.fn(),
    notificationError: vi.fn(),
    vibrate: vi.fn(),
  }),
}))

describe('Dashboard', () => {
  it('renders SOS button', () => {
    render(
      <ApiProvider>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </ApiProvider>
    )
    expect(screen.getByText('SOS')).toBeInTheDocument()
  })

  it('renders emergency type selector', () => {
    render(
      <ApiProvider>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </ApiProvider>
    )
    expect(screen.getByText('Medical')).toBeInTheDocument()
    expect(screen.getByText('Security')).toBeInTheDocument()
    expect(screen.getByText('Fire')).toBeInTheDocument()
  })

  it('renders Get Location button', () => {
    render(
      <ApiProvider>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </ApiProvider>
    )
    expect(screen.getByText('Get Location')).toBeInTheDocument()
  })
})
