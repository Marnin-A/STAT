import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ActionButton } from './ActionButton'

describe('ActionButton', () => {
  it('renders with text', () => {
    render(<ActionButton>Click Me</ActionButton>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('applies touch-target min height', () => {
    render(<ActionButton>Button</ActionButton>)
    expect(screen.getByRole('button')).toHaveClass('touch-target')
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<ActionButton onClick={onClick}>Click</ActionButton>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders primary variant by default', () => {
    render(<ActionButton>Primary</ActionButton>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary')
  })

  it('renders secondary variant', () => {
    render(<ActionButton variant="secondary">Secondary</ActionButton>)
    expect(screen.getByRole('button')).toHaveClass('bg-secondary')
  })

  it('renders icon when provided', () => {
    render(<ActionButton icon="emergency">With Icon</ActionButton>)
    expect(screen.getByText('emergency')).toBeInTheDocument()
  })

  it('disables when disabled prop is true', () => {
    render(<ActionButton disabled>Disabled</ActionButton>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
