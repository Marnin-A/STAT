import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { FireHazard } from './FireHazard'

describe('FireHazard', () => {
  it('renders chemical fire heading', () => {
    render(<BrowserRouter><FireHazard /></BrowserRouter>)
    expect(screen.getByText(/Chemical Fire/i)).toBeInTheDocument()
  })

  it('renders hazmat alert', () => {
    render(<BrowserRouter><FireHazard /></BrowserRouter>)
    expect(screen.getByText(/Hazmat Alert/i)).toBeInTheDocument()
  })

  it('renders wind and temp cards', () => {
    render(<BrowserRouter><FireHazard /></BrowserRouter>)
    expect(screen.getByText('NE 15km/h')).toBeInTheDocument()
    expect(screen.getByText('850°C')).toBeInTheDocument()
  })
})
