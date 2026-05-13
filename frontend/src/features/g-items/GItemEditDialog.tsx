import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateGItem } from './useGItems'
import type { GItemEntry, ReasonCode } from './types'

const REASON_OPTIONS: { value: ReasonCode | 'UNSPECIFIED'; label: string }[] = [
  { value: 'UNSPECIFIED', label: 'Unspecified' },
  { value: 'QI', label: 'QI' },
  { value: 'FMEA_H_RISK', label: 'FMEA H-risk' },
  { value: 'OTHER', label: 'Other' },
]

interface Props {
  open: boolean
  item: GItemEntry | null
  onClose: () => void
}

export function GItemEditDialog({ open, item, onClose }: Props) {
  const [reason, setReason] = useState<ReasonCode | 'UNSPECIFIED'>('UNSPECIFIED')
  const [remark, setRemark] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mutation = useUpdateGItem()

  useEffect(() => {
    if (open && item) {
      setReason(item.reason ?? 'UNSPECIFIED')
      setRemark(item.remark ?? '')
      setError(null)
    }
  }, [open, item])

  async function handleSave() {
    if (!item) return
    setError(null)
    try {
      await mutation.mutateAsync({
        solutionId: item.id,
        payload: {
          reason: reason === 'UNSPECIFIED' ? null : reason,
          remark: remark.trim() === '' ? null : remark,
        },
      })
      onClose()
    } catch {
      setError('Save failed. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit G$ Item{item ? ` — ${item.name}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as ReasonCode | 'UNSPECIFIED')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Remark</Label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm resize-none"
              rows={4}
              maxLength={1000}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Optional notes for this G$ item..."
            />
            <p className="text-xs text-muted-foreground text-right">
              {remark.length} / 1000
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
