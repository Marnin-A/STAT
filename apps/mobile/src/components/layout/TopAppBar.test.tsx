import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TopAppBar } from './TopAppBar'

describe('TopAppBar', () => {
  it('renders STAT branding', () => {
    render(<TopAppBar />)
    expect(screen.getByText('STAT')).toBeInTheDocument()
  })

  it('renders CALL DISPATCH button with tel link', () => {
    render(<TopAppBar />)
    const link = screen.getByRole('link', { name: /call dispatch/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'tel:911')
  })

  it('applies safe-area-top padding', () => {
    render(<TopAppBar />)
    const header = screen.getByRole('banner')
    expect(header).toHaveClass('safe-area-top')
  })
})
