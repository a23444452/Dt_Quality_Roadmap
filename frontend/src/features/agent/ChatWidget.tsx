import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, X, Send, Maximize2, Trash2, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAgentChat } from './useAgentChat'
import { AgentChart } from './AgentChart'

const QUICKSTART_PROMPTS = [
  '目前整體 MP 達成率是多少？',
  '哪個工廠的覆蓋率最低？',
  'G$ 項目今年的進度如何？',
  'Melting 製程有哪些 solutions？',
  '各狀態的 solution 數量分佈？',
]

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, isStreaming, sendMessage, clearChat, stopStreaming } = useAgentChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    setInput('')
    sendMessage(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
        aria-label="Open AI Assistant"
      >
        <MessageCircle size={24} />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[400px] flex-col rounded-xl border bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-blue-600 px-4 py-3 rounded-t-xl">
        <h3 className="text-sm font-semibold text-white">D^t AI Assistant</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/agent')}
            className="rounded p-1 text-blue-100 hover:bg-blue-700 hover:text-white"
            title="Open full page"
          >
            <Maximize2 size={16} />
          </button>
          <button
            onClick={clearChat}
            className="rounded p-1 text-blue-100 hover:bg-blue-700 hover:text-white"
            title="Clear chat"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-blue-100 hover:bg-blue-700 hover:text-white"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Hi! 我可以幫你分析 D^t Solution Roadmap 的資料。試試以下問題：</p>
            <div className="flex flex-wrap gap-2">
              {QUICKSTART_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full border px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.charts?.map((chart, i) => (
                <AgentChart key={i} chart={chart} />
              ))}
            </div>
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-100 px-3 py-2">
              <span className="animate-pulse text-sm text-gray-500">思考中...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2">
          <input
            id="agent-widget-input"
            name="agent-widget-input"
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入問題..."
            className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            disabled={isStreaming}
            maxLength={2000}
            autoComplete="off"
          />
          {isStreaming ? (
            <Button size="sm" variant="outline" onClick={stopStreaming}>
              <Square size={16} />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSend} disabled={!input.trim()}>
              <Send size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
