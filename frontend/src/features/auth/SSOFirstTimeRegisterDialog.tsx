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
  username: string
  email: string
  displayName: string
  onSubmitted: (message: string) => void
  onCancel: () => void
}

export function SSOFirstTimeRegisterDialog({
  open,
  username,
  email,
  displayName,
  onSubmitted,
  onCancel,
}: Props) {
  const { ssoRegister } = useAuth()

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
      const message = await ssoRegister({
        plant_ids: plantIds,
        process_ids: processIds,
      })
      onSubmitted(message || 'Registration submitted. Awaiting admin approval.')
    } catch (err) {
      const axiosError = err as {
        response?: { status?: number; data?: { detail?: string } }
      }
      if (axiosError.response?.status === 409) {
        setError(axiosError.response.data?.detail ?? 'This account is already registered.')
      } else if (axiosError.response?.status === 401) {
        setError('SSO session expired. Please sign in again.')
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
            Welcome <b>{displayName || username}</b>! Select your plant and process assignments.
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
            <Label>Name</Label>
            <Input type="text" value={displayName} disabled />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} disabled />
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
