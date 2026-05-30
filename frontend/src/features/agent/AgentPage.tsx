import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, Plus, Trash2, Square, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import { useAgentChat } from './useAgentChat'
import { AgentChart } from './AgentChart'
import type { Conversation } from './types'

const QUICKSTART_PROMPTS = [
  '目前整體 MP 達成率是多少？',
  '哪個工廠的覆蓋率最低？',
  'G$ 項目今年的進度如何？',
  'Melting 製程有哪些 solutions？',
  '各狀態的 solution 數量分佈？',
  '哪些 station 的 solution 最多？',
]

export function AgentPage() {
  const [input, setInput] = useState('')
  const { messages, isStreaming, sendMessage, clearChat, stopStreaming, conversationId, loadConversation } = useAgentChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  const { data: conversations } = useQuery({
    queryKey: ['agent-conversations'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<Conversation[]>>('/agent/conversations')
      return resp.data.data ?? []
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const handleDeleteConversation = async (id: string) => {
    await apiClient.delete(`/agent/conversations/${id}`)
    qc.invalidateQueries({ queryKey: ['agent-conversations'] })
  }

  return (
    <div className="flex h-full">
      {/* Sidebar - Conversation History */}
      <div className="w-64 border-r bg-gray-50 flex flex-col">
        <div className="p-3 border-b">
          <Button size="sm" className="w-full" onClick={clearChat}>
            <Plus size={16} className="mr-1" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations?.map((conv) => (
            <div
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`group flex items-center justify-between rounded px-2 py-1.5 text-sm cursor-pointer ${
                conversationId === conv.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'
              }`}
            >
              <span className="truncate flex-1">{conv.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id) }}
                className="hidden group-hover:block text-gray-400 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Bot size={32} className="text-blue-600" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold">D^t AI Assistant</h2>
                <p className="text-sm text-gray-500 mt-1">
                  我可以幫你分析品質解決方案的部署資料、G$ 追蹤進度等
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-lg">
                {QUICKSTART_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-lg border px-3 py-2 text-sm text-left text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
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
                className={`max-w-[70%] rounded-lg px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                {msg.charts?.map((chart, i) => (
                  <AgentChart key={i} chart={chart} />
                ))}
              </div>
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.content === '' && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-gray-100 px-4 py-3">
                <span className="animate-pulse text-sm text-gray-500">思考中...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="輸入問題...（例如：哪個工廠的 MP 比例最高？）"
              className="flex-1 rounded-lg border px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              disabled={isStreaming}
              maxLength={2000}
            />
            {isStreaming ? (
              <Button onClick={stopStreaming} variant="outline">
                <Square size={18} />
              </Button>
            ) : (
              <Button onClick={handleSend} disabled={!input.trim()}>
                <Send size={18} />
              </Button>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-gray-400">
            AI 僅根據系統內部資料回答，不會產生或引用外部資訊
          </p>
        </div>
      </div>
    </div>
  )
}
