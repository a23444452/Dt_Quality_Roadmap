import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { MsalProvider, useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import apiClient from '@/lib/api-client'
import { msalInstance, loginRequest } from '@/lib/msal-config'
import type {
  User,
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  SSOLoginResult,
  SSORegisterRequest,
} from '@/types/auth'
import type { ApiResponse } from '@/types/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<string>
  ssoLogin: () => Promise<SSOLoginResult>
  ssoRegister: (data: SSORegisterRequest) => Promise<string>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function AuthProviderInner({ children }: { children: ReactNode }) {
  const { instance, inProgress } = useMsal()
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

  useEffect(() => {
    if (inProgress !== InteractionStatus.None) return

    instance.handleRedirectPromise().then((response) => {
      if (response?.idToken) {
        localStorage.setItem('sso_id_token', response.idToken)
      }
    }).catch(() => {
      // Redirect errors handled in LoginPage
    })
  }, [instance, inProgress])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    localStorage.removeItem('sso_id_token')
    setUser(null)
  }, [])

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

  const ssoLogin = useCallback(async (): Promise<SSOLoginResult> => {
    let idToken = localStorage.getItem('sso_id_token')

    if (!idToken) {
      await instance.loginRedirect(loginRequest)
      throw new Error('Redirecting to Azure AD')
    }

    localStorage.removeItem('sso_id_token')

    const resp = await apiClient.post<ApiResponse<SSOLoginResult>>('/auth/sso-login', { id_token: idToken })
    const result = resp.data.data!

    if (result.status === 'authenticated') {
      localStorage.setItem('access_token', result.access_token)
      localStorage.setItem('user', JSON.stringify(result.user))
      setUser(result.user)
    }

    return result
  }, [instance])

  const ssoRegister = useCallback(async (data: SSORegisterRequest): Promise<string> => {
    const resp = await apiClient.post<ApiResponse<{ message: string }>>('/auth/sso-register', data)
    return resp.data.data!.message
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, ssoLogin, ssoRegister, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </MsalProvider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
