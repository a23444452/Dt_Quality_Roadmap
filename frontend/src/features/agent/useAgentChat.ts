import { useState, useCallback, useRef } from 'react'
import type { ChatMessage, ChartData, SSEEvent } from './types'

interface UseAgentChatOptions {
  onStreamComplete?: () => void
}

export function useAgentChat({ onStreamComplete }: UseAgentChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const onStreamCompleteRef = useRef(onStreamComplete)
  onStreamCompleteRef.current = onStreamComplete

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      charts: [],
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      abortRef.current = new AbortController()
      const token = localStorage.getItem('access_token')

      const response = await fetch('/api/v1/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: content,
          conversation_id: conversationId,
        }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const dataLine = line.replace(/^data: /, '').trim()
          if (!dataLine) continue

          try {
            const event: SSEEvent = JSON.parse(dataLine)

            if (event.type === 'token' && event.content) {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + event.content,
                  }
                }
                return updated
              })
            } else if (event.type === 'chart' && event.chart_config) {
              const chart: ChartData = {
                type: event.chart_config.type as ChartData['type'],
                title: event.chart_config.title,
                data: (event.data as Record<string, unknown>[]) || [],
                config: event.chart_config,
              }
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    charts: [...(last.charts || []), chart],
                  }
                }
                return updated
              })
            } else if (event.type === 'meta' && event.conversation_id) {
              setConversationId(event.conversation_id)
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'assistant' && !last.content) {
            updated[updated.length - 1] = {
              ...last,
              content: 'AI 服務暫時無法使用，請稍後再試。',
            }
          }
          return updated
        })
      }
    } finally {
      setIsStreaming(false)
      onStreamCompleteRef.current?.()
    }
  }, [conversationId])

  const loadConversation = useCallback(async (convId: string) => {
    try {
      const token = localStorage.getItem('access_token')
      const resp = await fetch(`/api/v1/agent/conversations/${convId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!resp.ok) return
      const result = await resp.json()
      const history = result.data?.messages || []
      const loaded: ChatMessage[] = history.map((m: { role: string; content: string }) => ({
        id: crypto.randomUUID(),
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date().toISOString(),
      }))
      setMessages(loaded)
      setConversationId(convId)
    } catch {
      // ignore load errors
    }
  }, [])

  const clearChat = useCallback(() => {
    setMessages([])
    setConversationId(null)
  }, [])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  return { messages, isStreaming, sendMessage, clearChat, stopStreaming, conversationId, loadConversation }
}
