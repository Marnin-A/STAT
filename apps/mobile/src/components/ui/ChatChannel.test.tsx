import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ChatChannel } from './ChatChannel'
import type { ChatMessage } from '@stat/shared'

const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    incidentId: 'inc-001',
    senderId: 'user-1',
    senderName: 'Dispatch',
    message: 'Unit 14 en route',
    timestamp: new Date().toISOString(),
    isOwn: false,
  },
  {
    id: 'msg-2',
    incidentId: 'inc-001',
    senderId: 'user-2',
    senderName: 'Unit 14',
    message: 'Copy, ETA 3 min',
    timestamp: new Date().toISOString(),
    isOwn: true,
  },
]

describe('ChatChannel', () => {
  it('renders messages', () => {
    render(<ChatChannel messages={mockMessages} onSend={vi.fn()} />)
    expect(screen.getByText('Unit 14 en route')).toBeInTheDocument()
    expect(screen.getByText('Copy, ETA 3 min')).toBeInTheDocument()
  })

  it('renders sender names', () => {
    render(<ChatChannel messages={mockMessages} onSend={vi.fn()} />)
    expect(screen.getByText('Dispatch')).toBeInTheDocument()
    expect(screen.getByText('Unit 14')).toBeInTheDocument()
  })

  it('calls onSend when send button clicked', async () => {
    const onSend = vi.fn()
    render(<ChatChannel messages={mockMessages} onSend={onSend} />)
    const input = screen.getByPlaceholderText(/message/i)
    await userEvent.type(input, 'Roger that')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSend).toHaveBeenCalledWith('Roger that')
  })
})
