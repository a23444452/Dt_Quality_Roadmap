import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { useAuth } from './AuthContext'
import { ADFirstTimeRegisterDialog } from './ADFirstTimeRegisterDialog'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'

export function LoginPage() {
  const { login, adLogin } = useAuth()
  const navigate = useNavigate()

  const [adUsername, setAdUsername] = useState('')
  const [adPassword, setAdPassword] = useState('')
  const [adError, setAdError] = useState<string | null>(null)
  const [adSubmitting, setAdSubmitting] = useState(false)
  const [adInfo, setAdInfo] = useState<string | null>(null)

  const [localUsername, setLocalUsername] = useState('')
  const [localPassword, setLocalPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [localSubmitting, setLocalSubmitting] = useState(false)

  const [registerDialog, setRegisterDialog] = useState<{ open: boolean; ntAccount: string; password: string }>({
    open: false,
    ntAccount: '',
    password: '',
  })
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null)

  const { data: systemConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<{ admin_emails: string[]; app_url: string }>>('/reference/system-config')
      return resp.data.data ?? { admin_emails: [], app_url: '' }
    },
    staleTime: 300000,
  })

  const handleADSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setAdError(null)
    setAdInfo(null)
    setAdSubmitting(true)
    try {
      const result = await adLogin({ username: adUsername, password: adPassword })
      if (result.status === 'authenticated') {
        navigate('/', { replace: true })
        return
      }
      if (result.status === 'pending_approval') {
        setAdInfo('Your account is awaiting administrator approval.')
        return
      }
      if (result.status === 'need_registration') {
        setRegisterDialog({ open: true, ntAccount: result.username, password: adPassword })
      }
    } catch (err) {
      const axiosError = err as { response?: { status?: number; data?: { detail?: string } } }
      if (axiosError.response?.status === 401) {
        setAdError('Invalid Corning credentials. Please try again.')
      } else if (axiosError.response?.status === 403) {
        setAdError(axiosError.response.data?.detail ?? 'Account is not active.')
      } else {
        setAdError('Sign-in failed. Please try again.')
      }
    } finally {
      setAdSubmitting(false)
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
    setRegisterDialog({ open: false, ntAccount: '', password: '' })
    setAdPassword('')
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

        <CardContent>
          <Tabs defaultValue="ad" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ad">Corning AD</TabsTrigger>
              <TabsTrigger value="local">Local Account</TabsTrigger>
            </TabsList>

            <TabsContent value="ad" className="mt-4">
              <form onSubmit={handleADSubmit} className="space-y-4">
                {adError && (
                  <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    {adError}
                  </div>
                )}
                {adInfo && (
                  <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                    {adInfo}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="ad-username">NT Account</Label>
                  <Input
                    id="ad-username"
                    type="text"
                    autoComplete="username"
                    required
                    placeholder="e.g. wangm44"
                    value={adUsername}
                    onChange={(e) => setAdUsername(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-password">Corning Password</Label>
                  <Input
                    id="ad-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={adPassword}
                    onChange={(e) => setAdPassword(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={adSubmitting}>
                  {adSubmitting ? 'Signing in...' : 'Sign In with Corning AD'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="local" className="mt-4">
              <form onSubmit={handleLocalSubmit} className="space-y-4">
                {localError && (
                  <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    {localError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="local-username">NT Account</Label>
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
            </TabsContent>
          </Tabs>
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

      <ADFirstTimeRegisterDialog
        open={registerDialog.open}
        ntAccount={registerDialog.ntAccount}
        password={registerDialog.password}
        onSubmitted={handleRegistrationSubmitted}
        onCancel={() => setRegisterDialog({ open: false, ntAccount: '', password: '' })}
      />
    </div>
  )
}
