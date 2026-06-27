import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { TriageList } from './TriageList'
import { ApiProvider } from '../api/ApiProvider'

describe('TriageList', () => {
  it('renders heading', () => {
    render(
      <ApiProvider>
        <BrowserRouter>
          <TriageList />
        </BrowserRouter>
      </ApiProvider>
    )
    expect(screen.getByText('Active Emergencies')).toBeInTheDocument()
  })

  it('renders filter buttons', () => {
    render(
      <ApiProvider>
        <BrowserRouter>
          <TriageList />
        </BrowserRouter>
      </ApiProvider>
    )
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Medical')).toBeInTheDocument()
    expect(screen.getByText('Fire')).toBeInTheDocument()
    expect(screen.getByText('Security')).toBeInTheDocument()
  })
})
