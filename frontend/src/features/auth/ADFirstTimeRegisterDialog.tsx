import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from './AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'

interface ReferenceOption {
  id: number
  name: string
}

interface ReferenceOptions {
  plants: ReferenceOption[]
  processes: ReferenceOption[]
}

interface Props {
  open: boolean
  ntAccount: string
  password: string
  onSubmitted: (message: string) => void
  onCancel: () => void
}

export function ADFirstTimeRegisterDialog({
  open,
  ntAccount,
  password,
  onSubmitted,
  onCancel,
}: Props) {
  const { adRegister } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [plantIds, setPlantIds] = useState<number[]>([])
  const [processIds, setProcessIds] = useState<number[]>([])
  const [options, setOptions] = useState<ReferenceOptions>({ plants: [], processes: [] })
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setOptionsLoading(true)
    apiClient
      .get<ApiResponse<ReferenceOptions>>('/reference/options')
      .then((resp) => {
        if (resp.data.data) setOptions(resp.data.data)
      })
      .finally(() => setOptionsLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) {
      setDisplayName('')
      setEmail('')
      setPlantIds([])
      setProcessIds([])
      setError(null)
    }
  }, [open])

  const togglePlant = (id: number) => {
    setPlantIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleProcess = (id: number) => {
    setProcessIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (plantIds.length === 0 || processIds.length === 0) {
      setError('Please select at least one plant and one process.')
      return
    }

    setIsSubmitting(true)
    try {
      const message = await adRegister({
        username: ntAccount,
        password,
        email,
        display_name: displayName,
        plant_ids: plantIds,
        process_ids: processIds,
      })
      onSubmitted(message || 'Registration submitted. Awaiting admin approval.')
    } catch (err) {
      const axiosError = err as {
        response?: { status?: number; data?: { detail?: string } }
      }
      if (axiosError.response?.status === 409) {
        setError(
          typeof axiosError.response.data?.detail === 'string'
            ? axiosError.response.data.detail
            : 'This NT account or email is already registered.',
        )
      } else if (axiosError.response?.status === 401) {
        setError('Corning credentials no longer valid. Please sign in again.')
      } else if (typeof axiosError.response?.data?.detail === 'string') {
        setError(axiosError.response.data.detail)
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete your registration</DialogTitle>
          <DialogDescription>
            Your NT account <b>{ntAccount}</b> is verified. Select your plant and process assignments.
            An administrator will approve your access.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ad-display-name">Name</Label>
            <Input
              id="ad-display-name"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ad-email">Email</Label>
            <Input
              id="ad-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {!optionsLoading && (
            <>
              <div className="space-y-2">
                <Label>Plant (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-32 overflow-y-auto">
                  {options.plants.map((plant) => (
                    <label
                      key={plant.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={plantIds.includes(plant.id)}
                        onCheckedChange={() => togglePlant(plant.id)}
                      />
                      {plant.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Process (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-32 overflow-y-auto">
                  {options.processes.map((proc) => (
                    <label
                      key={proc.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={processIds.includes(proc.id)}
                        onCheckedChange={() => toggleProcess(proc.id)}
                      />
                      {proc.name}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || optionsLoading}>
              {isSubmitting ? 'Submitting...' : 'Submit for approval'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
