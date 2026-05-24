import { useState, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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

interface ReferenceOption {
  id: number
  name: string
  code?: string
  category?: string
}

interface ReferenceOptions {
  plants: ReferenceOption[]
  processes: ReferenceOption[]
}

export function RegisterPage() {
  const { register } = useAuth()

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    display_name: '',
    plant_ids: [] as number[],
    process_ids: [] as number[],
  })
  const [options, setOptions] = useState<ReferenceOptions>({ plants: [], processes: [] })
  const [optionsLoading, setOptionsLoading] = useState(true)

  useEffect(() => {
    apiClient.get<ApiResponse<ReferenceOptions>>('/reference/options')
      .then((resp) => {
        if (resp.data.data) {
          setOptions(resp.data.data)
        }
      })
      .finally(() => setOptionsLoading(false))
  }, [])
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field: 'username' | 'email' | 'password' | 'display_name') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const togglePlant = (plantId: number) => {
    setFormData((prev) => ({
      ...prev,
      plant_ids: prev.plant_ids.includes(plantId)
        ? prev.plant_ids.filter((id) => id !== plantId)
        : [...prev.plant_ids, plantId],
    }))
  }

  const toggleProcess = (processId: number) => {
    setFormData((prev) => ({
      ...prev,
      process_ids: prev.process_ids.includes(processId)
        ? prev.process_ids.filter((id) => id !== processId)
        : [...prev.process_ids, processId],
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const message = await register(formData)
      setSuccessMessage(message || 'Registration submitted. Awaiting admin approval.')
    } catch (err) {
      // Extract error message from API response
      const axiosError = err as {
        response?: {
          status?: number
          data?: {
            detail?: string | Array<{ loc: string[]; msg: string; type: string }>
          }
        }
      }

      if (axiosError.response?.status === 409) {
        setError('Registration failed. The username or email is already taken.')
      } else if (axiosError.response?.status === 422) {
        // Validation error - extract field-specific messages
        const detail = axiosError.response.data?.detail
        if (Array.isArray(detail) && detail.length > 0) {
          const messages = detail.map((d) => d.msg).join('; ')
          setError(`Validation failed: ${messages}`)
        } else {
          setError('Validation failed. Please check your input.')
        }
      } else if (typeof axiosError.response?.data?.detail === 'string') {
        setError(`Registration failed: ${axiosError.response.data.detail}`)
      } else {
        setError('Registration failed. Please check your input and try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (successMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Registration Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{successMessage}</p>
          </CardContent>
          <CardFooter>
            <Link to="/login" className="text-sm text-foreground underline-offset-4 hover:underline">
              Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            Register for Quality D^t Solution Map System access
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
              <Label htmlFor="display_name">Name</Label>
              <Input
                id="display_name"
                type="text"
                autoComplete="name"
                required
                value={formData.display_name}
                onChange={handleChange('display_name')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">NT Account</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={handleChange('username')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange('email')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={formData.password}
                onChange={handleChange('password')}
              />
              <p className="text-xs text-muted-foreground">
                At least 8 characters, including uppercase, lowercase, and a number
              </p>
            </div>

            {!optionsLoading && (
              <>
                <div className="space-y-2">
                  <Label>Plant (select your assigned plants)</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-32 overflow-y-auto">
                    {options.plants.map((plant) => (
                      <label key={plant.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={formData.plant_ids.includes(plant.id)}
                          onCheckedChange={() => togglePlant(plant.id)}
                        />
                        {plant.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Process (select your assigned processes)</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-32 overflow-y-auto">
                    {options.processes.map((process) => (
                      <label key={process.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={formData.process_ids.includes(process.id)}
                          onCheckedChange={() => toggleProcess(process.id)}
                        />
                        {process.name}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-foreground underline-offset-4 hover:underline font-medium"
              >
                Sign In
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
