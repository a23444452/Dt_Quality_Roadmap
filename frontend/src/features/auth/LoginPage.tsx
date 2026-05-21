import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { Mail } from 'lucide-react'
import { useAuth } from './AuthContext'
import { SSOFirstTimeRegisterDialog } from './SSOFirstTimeRegisterDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'

export function LoginPage() {
  const { ssoLogin, login } = useAuth()
  const { inProgress } = useMsal()
  const navigate = useNavigate()

  const [ssoError, setSsoError] = useState<string | null>(null)
  const [ssoLoading, setSsoLoading] = useState(false)
  const [ssoInfo, setSsoInfo] = useState<string | null>(null)

  const [localUsername, setLocalUsername] = useState('')
  const [localPassword, setLocalPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [localSubmitting, setLocalSubmitting] = useState(false)

  const [registerDialog, setRegisterDialog] = useState<{
    open: boolean
    username: string
    email: string
    displayName: string
  }>({ open: false, username: '', email: '', displayName: '' })

  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null)

  const { data: systemConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<{ admin_emails: string[]; app_url: string }>>('/reference/system-config')
      return resp.data.data ?? { admin_emails: [], app_url: '' }
    },
    staleTime: 300000,
  })

  useEffect(() => {
    if (inProgress !== InteractionStatus.None) return
    if (!sessionStorage.getItem('sso_redirect_pending')) return
    sessionStorage.removeItem('sso_redirect_pending')

    setSsoLoading(true)
    ssoLogin()
      .then((result) => {
        if (result.status === 'authenticated') {
          navigate('/', { replace: true })
        } else if (result.status === 'pending_approval') {
          setSsoInfo('Your account is awaiting administrator approval.')
        } else if (result.status === 'need_registration') {
          setRegisterDialog({
            open: true,
            username: result.username,
            email: result.email,
            displayName: result.display_name,
          })
        }
      })
      .catch((err) => {
        const axiosError = err as { response?: { status?: number; data?: { detail?: string } } }
        if (axiosError.response?.status === 401) {
          setSsoError('SSO verification failed. Please sign in again.')
        } else if (axiosError.response?.status === 403) {
          setSsoError('Access denied. You are not a member of the required AD group.')
        } else if (axiosError.response?.status === 503) {
          setSsoError('Service temporarily unavailable. Please try again.')
        } else if (err instanceof Error && err.message === 'Redirecting to Azure AD') {
          // Expected
        } else {
          setSsoError('Sign-in failed. Please try again.')
        }
      })
      .finally(() => setSsoLoading(false))
  }, [inProgress, ssoLogin, navigate])

  const handleSSOClick = async () => {
    setSsoError(null)
    setSsoInfo(null)
    setSsoLoading(true)
    try {
      const result = await ssoLogin()
      if (result.status === 'authenticated') {
        navigate('/', { replace: true })
      } else if (result.status === 'pending_approval') {
        setSsoInfo('Your account is awaiting administrator approval.')
      } else if (result.status === 'need_registration') {
        setRegisterDialog({
          open: true,
          username: result.username,
          email: result.email,
          displayName: result.display_name,
        })
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Redirecting to Azure AD') {
        return
      }
      const axiosError = err as { response?: { status?: number } }
      if (axiosError.response?.status === 403) {
        setSsoError('Access denied. You are not a member of the required AD group.')
      } else {
        setSsoError('Sign-in failed. Please try again.')
      }
    } finally {
      setSsoLoading(false)
    }
  }

  const handleLocalSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setLocalSubmitting(true)
    try {
      await login({ username: localUsername, password: localPassword })
      navigate('/', { replace: true })
    } catch {
      setLocalError('Invalid username or password. Please try again.')
    } finally {
      setLocalSubmitting(false)
    }
  }

  const handleRegistrationSubmitted = (message: string) => {
    setRegisterDialog({ open: false, username: '', email: '', displayName: '' })
    setRegisterSuccess(message)
  }

  if (registerSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Registration Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{registerSuccess}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setRegisterSuccess(null)}>
              Back to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>Access D^t Solution Roadmap</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {ssoError && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {ssoError}
            </div>
          )}
          {ssoInfo && (
            <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
              {ssoInfo}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleSSOClick}
            disabled={ssoLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            {ssoLoading ? 'Signing in...' : 'Sign in with Microsoft'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleLocalSubmit} className="space-y-4">
            {localError && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {localError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="local-username">Username</Label>
              <Input
                id="local-username"
                type="text"
                autoComplete="username"
                required
                value={localUsername}
                onChange={(e) => setLocalUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="local-password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="local-password"
                type="password"
                autoComplete="current-password"
                required
                value={localPassword}
                onChange={(e) => setLocalPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={localSubmitting}>
              {localSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="text-foreground underline-offset-4 hover:underline font-medium"
              >
                Register
              </Link>
            </p>
          </form>
        </CardContent>

        {systemConfig?.admin_emails && systemConfig.admin_emails.length > 0 && (
          <div className="border-t px-6 py-4">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
              <Mail size={12} />
              Admin Contact
            </p>
            {systemConfig.admin_emails.map((email) => (
              <a
                key={email}
                href={`mailto:${email}`}
                className="block text-xs text-muted-foreground hover:text-foreground"
              >
                {email}
              </a>
            ))}
          </div>
        )}
      </Card>

      <SSOFirstTimeRegisterDialog
        open={registerDialog.open}
        username={registerDialog.username}
        email={registerDialog.email}
        displayName={registerDialog.displayName}
        onSubmitted={handleRegistrationSubmitted}
        onCancel={() => setRegisterDialog({ open: false, username: '', email: '', displayName: '' })}
      />
    </div>
  )
}
