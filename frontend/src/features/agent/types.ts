export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  charts?: ChartData[]
  timestamp: string
}

export interface ChartData {
  type: 'bar' | 'pie' | 'line' | 'table'
  title: string
  data: Record<string, unknown>[]
  config: ChartConfig
}

export interface ChartConfig {
  type: string
  title: string
  x_field?: string
  y_field?: string
  y_fields?: string[]
  series_field?: string
  value_field?: string
}

export interface Conversation {
  id: string
  title: string
  created_at: string
  message_count: number
}

export interface SSEEvent {
  type: 'token' | 'chart' | 'done' | 'meta' | 'error'
  content?: string
  chart_config?: ChartConfig
  data?: Record<string, unknown>[]
  conversation_id?: string
  message?: string
}
