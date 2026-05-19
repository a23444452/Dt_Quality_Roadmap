import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { SolutionMapStatus } from '@/types/solution-map'
import type { Status } from '@/types/reference-data'
import { useUpdateSolutionMap, useCreateSolutionMap } from '@/hooks/useSolutionMap'

interface StatusCellEditorProps {
  open: boolean
  onClose: () => void
  solutionId: number
  solutionName: string
  tankLineId: number
  lineName: string
  lineKey: string
  current: SolutionMapStatus | null
  statuses: Status[]
}

export function StatusCellEditor({
  open,
  onClose,
  solutionId,
  solutionName,
  tankLineId,
  lineName,
  lineKey,
  current,
  statuses,
}: StatusCellEditorProps) {
  const [statusId, setStatusId] = useState<number>(current?.status_id ?? statuses[0]?.id ?? 0)
  const [notes, setNotes] = useState<string>(current?.notes ?? '')
  const [conflictError, setConflictError] = useState<string | null>(null)

  const updateMutation = useUpdateSolutionMap()
  const createMutation = useCreateSolutionMap()

  const isSaving = updateMutation.isPending || createMutation.isPending

  async function handleSave() {
    setConflictError(null)
    try {
      if (current) {
        await updateMutation.mutateAsync({
          mapId: current.map_id,
          data: { status_id: statusId, notes: notes || undefined, version: current.version },
        })
      } else {
        await createMutation.mutateAsync({
          solution_id: solutionId,
          tank_line_id: tankLineId,
          status_id: statusId,
          notes: notes || undefined,
        })
      }
      onClose()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } }
      if (axiosErr?.response?.status === 409) {
        setConflictError('This record was modified by another user. Please refresh and try again.')
      } else {
        setConflictError('Failed to save. Please try again.')
      }
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setConflictError(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm text-gray-500">Solution</p>
            <p className="font-medium">{solutionName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Line</p>
            <p className="font-medium">{lineName} ({lineKey})</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Status</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={statusId}
              onChange={(e) => setStatusId(Number(e.target.value))}
            >
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm resize-none"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
            />
          </div>
          {conflictError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {conflictError}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
