import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusStrip } from './StatusStrip'

describe('StatusStrip', () => {
  it('renders children', () => {
    render(<StatusStrip priority="critical">Content</StatusStrip>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('applies critical class for critical priority', () => {
    const { container } = render(<StatusStrip priority="critical">Critical</StatusStrip>)
    expect(container.firstChild).toHaveClass('status-strip-critical')
  })

  it('applies serious class for serious priority', () => {
    const { container } = render(<StatusStrip priority="serious">Serious</StatusStrip>)
    expect(container.firstChild).toHaveClass('status-strip-serious')
  })

  it('applies stable class for stable priority', () => {
    const { container } = render(<StatusStrip priority="stable">Stable</StatusStrip>)
    expect(container.firstChild).toHaveClass('status-strip-stable')
  })
})
