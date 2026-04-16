export interface PaginationMeta {
  total: number
  page: number
  limit: number
}

export interface ApiError {
  code: string
  message: string
  details: Array<{ field?: string; message: string }>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  meta?: PaginationMeta
  error?: ApiError
}
