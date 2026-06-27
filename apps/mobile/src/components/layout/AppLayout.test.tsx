import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { AppLayout } from './AppLayout'

describe('AppLayout', () => {
  it('renders TopAppBar and BottomNavBar', () => {
    render(
      <BrowserRouter>
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      </BrowserRouter>
    )
    expect(screen.getByText('STAT')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(
      <BrowserRouter>
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      </BrowserRouter>
    )
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })
})
