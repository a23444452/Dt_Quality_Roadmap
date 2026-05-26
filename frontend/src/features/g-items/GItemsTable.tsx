import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GItemRowExpanded } from './GItemRowExpanded'
import type { GItemEntry } from './types'
import { REASON_LABELS } from './types'
import type { User } from '@/types/auth'

interface Props {
  items: GItemEntry[]
  user: User | null
  statuses: { id: number; code: string; name: string; color: string }[]
  selectedPlantIds?: number[]
  onEdit: (item: GItemEntry) => void
}

export function GItemsTable({ items, user, statuses, selectedPlantIds, onEdit }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const isAdmin = user?.role === 'admin'

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (items.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-muted-foreground">
        No G$ items match the current filters.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Solution</TableHead>
          <TableHead>Process</TableHead>
          <TableHead>Station</TableHead>
          <TableHead>Quality Attribute</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Remark</TableHead>
          {isAdmin && <TableHead className="w-20">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((it) => {
          const isOpen = expanded.has(it.id)
          return (
            <Fragment key={it.id}>
              <TableRow className="hover:bg-gray-50">
                <TableCell>
                  <button
                    onClick={() => toggle(it.id)}
                    className="p-1 rounded hover:bg-gray-200"
                    aria-label={isOpen ? 'Collapse' : 'Expand'}
                  >
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                </TableCell>
                <TableCell className="font-medium">{it.name}</TableCell>
                <TableCell>{it.process}</TableCell>
                <TableCell>{it.station}</TableCell>
                <TableCell>{it.quality_attribute ?? '—'}</TableCell>
                <TableCell>
                  {it.reason ? (
                    <Badge variant="outline">{REASON_LABELS[it.reason]}</Badge>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell className="max-w-xs truncate" title={it.remark ?? ''}>
                  {it.remark ?? <span className="text-gray-400">—</span>}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => onEdit(it)}
                    >
                      <Pencil size={12} /> Edit
                    </Button>
                  </TableCell>
                )}
              </TableRow>
              {isOpen && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="p-0">
                    <GItemRowExpanded
                      item={it}
                      user={user}
                      statuses={statuses}
                      selectedPlantIds={selectedPlantIds}
                    />
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}
