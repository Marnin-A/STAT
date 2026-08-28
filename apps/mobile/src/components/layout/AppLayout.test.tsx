import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import type { ApiClient } from '@stat/shared'
import { ApiProvider } from '../../api/ApiProvider'
import { AppLayout } from './AppLayout'

// The layout carries the offline banner, which reads the queue from storage.
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: null })),
    set: vi.fn(async () => undefined),
  },
}))

function renderLayout() {
  return render(
    <ApiProvider client={{} as ApiClient}>
      <BrowserRouter>
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      </BrowserRouter>
    </ApiProvider>,
  )
}

describe('AppLayout', () => {
  it('renders TopAppBar and BottomNavBar', () => {
    renderLayout()

    expect(screen.getByText('STAT')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders children content', () => {
    renderLayout()

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })
})
