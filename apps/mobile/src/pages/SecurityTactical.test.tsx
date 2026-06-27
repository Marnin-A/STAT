import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { SecurityTactical } from './SecurityTactical'

describe('SecurityTactical', () => {
  it('renders threat level', () => {
    render(<BrowserRouter><SecurityTactical /></BrowserRouter>)
    expect(screen.getByText('HIGH')).toBeInTheDocument()
  })

  it('renders suspects count', () => {
    render(<BrowserRouter><SecurityTactical /></BrowserRouter>)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders body cam section', () => {
    render(<BrowserRouter><SecurityTactical /></BrowserRouter>)
    expect(screen.getByText(/Body Cam/i)).toBeInTheDocument()
  })
})
