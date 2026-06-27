import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MapPlaceholder } from './MapPlaceholder'

describe('MapPlaceholder', () => {
  it('renders map container', () => {
    render(<MapPlaceholder center={{ lat: 6.5, lng: 3.4 }} />)
    const container = screen.getByTestId('map-container')
    expect(container).toBeInTheDocument()
  })

  it('displays ETA when provided', () => {
    render(<MapPlaceholder center={{ lat: 6.5, lng: 3.4 }} eta="5 min" />)
    expect(screen.getByText('ETA: 5 min')).toBeInTheDocument()
  })
})
