import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import apiClient from '@/lib/api-client'
import type { User, LoginRequest, RegisterRequest, LoginResponse } from '@/types/auth'
import type { ApiResponse } from '@/types/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<string>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const storedUser = localStorage.getItem('user')
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  // Silent refresh: refresh token before expiry (7h55m interval for 8h tokens)
  useEffect(() => {
    if (!user) return

    const refreshInterval = setInterval(async () => {
      try {
        const resp = await apiClient.post<ApiResponse<{ access_token: string }>>('/auth/refresh')
        if (resp.data.data?.access_token) {
          localStorage.setItem('access_token', resp.data.data.access_token)
        }
      } catch {
        logout()
      }
    }, (8 * 60 - 5) * 60 * 1000)

    return () => clearInterval(refreshInterval)
  }, [user, logout])

  const login = useCallback(async (data: LoginRequest) => {
    const resp = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data)
    const loginData = resp.data.data!
    localStorage.setItem('access_token', loginData.access_token)
    localStorage.setItem('user', JSON.stringify(loginData.user))
    setUser(loginData.user)
  }, [])

  const register = useCallback(async (data: RegisterRequest): Promise<string> => {
    const resp = await apiClient.post<ApiResponse<{ message: string }>>('/auth/register', data)
    return resp.data.data!.message
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
