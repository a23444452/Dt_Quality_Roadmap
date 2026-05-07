import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { useAuth } from './AuthContext'
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
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch system config for admin contact emails
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<{ admin_emails: string[]; app_url: string }>>('/reference/system-config')
      return resp.data.data ?? { admin_emails: [], app_url: '' }
    },
    staleTime: 300000, // Cache for 5 minutes
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login({ username, password })
      navigate('/', { replace: true })
    } catch {
      setError('Invalid username or password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access D^t Solution Roadmap
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">NT Account</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
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
          </CardFooter>
        </form>

        {/* Admin Contact */}
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
    </div>
  )
}
