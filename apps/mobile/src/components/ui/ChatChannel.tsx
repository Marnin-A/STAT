import { useState } from 'react'
import type { ChatMessage } from '@stat/shared'

interface ChatChannelProps {
  messages: ChatMessage[]
  onSend: (message: string) => void
}

export function ChatChannel({ messages, onSend }: ChatChannelProps) {
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div className="flex flex-col border-2 border-outline-variant rounded bg-surface-container-lowest">
      <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-64">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}>
            <span className="text-xs font-semibold text-on-surface-variant mb-1">{msg.senderName}</span>
            <div className={`px-3 py-2 rounded-lg text-sm max-w-[80%] ${
              msg.isOwn
                ? 'bg-secondary text-on-secondary'
                : 'bg-surface-container text-on-surface'
            }`}>
              {msg.message}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 p-3 border-t-2 border-outline-variant">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type message..."
          className="flex-1 px-3 py-2 border-2 border-outline-variant rounded text-sm bg-surface-container-lowest"
        />
        <button
          onClick={handleSend}
          className="touch-target px-4 bg-primary text-on-primary rounded font-bold text-sm uppercase"
        >
          Send
        </button>
      </div>
    </div>
  )
}
