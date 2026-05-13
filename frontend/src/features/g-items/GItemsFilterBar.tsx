import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ChevronDown, Search, X } from 'lucide-react'
import type { GItemFilters, ReasonCode } from './types'
import { REASON_LABELS } from './types'

interface Option {
  id: number
  name: string
}

interface Props {
  plants: Option[]
  processes: Option[]
  filters: GItemFilters
  onChange: (next: GItemFilters) => void
}

const REASON_VALUES: (ReasonCode | 'UNSPECIFIED')[] = [
  'QI',
  'FMEA_H_RISK',
  'OTHER',
  'UNSPECIFIED',
]

export function GItemsFilterBar({ plants, processes, filters, onChange }: Props) {
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '')

  // Debounce search
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchDraft !== (filters.search ?? '')) {
        onChange({ ...filters, search: searchDraft || undefined, page: 1 })
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [searchDraft]) // eslint-disable-line react-hooks/exhaustive-deps

  function togglePlant(id: number) {
    const cur = new Set(filters.plant_ids ?? [])
    cur.has(id) ? cur.delete(id) : cur.add(id)
    onChange({ ...filters, plant_ids: Array.from(cur), page: 1 })
  }

  function toggleProcess(id: number) {
    const cur = new Set(filters.process_ids ?? [])
    cur.has(id) ? cur.delete(id) : cur.add(id)
    onChange({ ...filters, process_ids: Array.from(cur), page: 1 })
  }

  function toggleReason(r: ReasonCode | 'UNSPECIFIED') {
    const cur = new Set(filters.reasons ?? [])
    cur.has(r) ? cur.delete(r) : cur.add(r)
    onChange({ ...filters, reasons: Array.from(cur), page: 1 })
  }

  const selectedPlantCount = filters.plant_ids?.length ?? 0
  const selectedProcessCount = filters.process_ids?.length ?? 0
  const selectedReasonCount = filters.reasons?.length ?? 0

  const hasAnyFilter =
    !!filters.search || selectedPlantCount + selectedProcessCount + selectedReasonCount > 0

  function clearAll() {
    setSearchDraft('')
    onChange({ page: 1, limit: filters.limit })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b bg-white">
      {/* Plants */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            Plants{selectedPlantCount > 0 ? ` (${selectedPlantCount})` : ''}
            <ChevronDown size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          {plants.length === 0 ? (
            <p className="text-xs text-muted-foreground">No plants</p>
          ) : (
            plants.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                <Checkbox
                  checked={filters.plant_ids?.includes(p.id) ?? false}
                  onCheckedChange={() => togglePlant(p.id)}
                />
                {p.name}
              </label>
            ))
          )}
        </PopoverContent>
      </Popover>

      {/* Processes */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            Processes{selectedProcessCount > 0 ? ` (${selectedProcessCount})` : ''}
            <ChevronDown size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          {processes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No processes</p>
          ) : (
            processes.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                <Checkbox
                  checked={filters.process_ids?.includes(p.id) ?? false}
                  onCheckedChange={() => toggleProcess(p.id)}
                />
                {p.name}
              </label>
            ))
          )}
        </PopoverContent>
      </Popover>

      {/* Reasons */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            Reason{selectedReasonCount > 0 ? ` (${selectedReasonCount})` : ''}
            <ChevronDown size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          {REASON_VALUES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
              <Checkbox
                checked={filters.reasons?.includes(r) ?? false}
                onCheckedChange={() => toggleReason(r)}
              />
              {REASON_LABELS[r]}
            </label>
          ))}
        </PopoverContent>
      </Popover>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search solution name..."
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          className="pl-7 h-8 w-56 text-sm"
        />
      </div>

      {hasAnyFilter && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1">
          <X size={12} /> Clear
        </Button>
      )}
    </div>
  )
}
