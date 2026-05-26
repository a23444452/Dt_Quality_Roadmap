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
import type { GItemEntry } from './types'
import { REASON_LABELS } from './types'
import type { User } from '@/types/auth'

interface Props {
  items: GItemEntry[]
  user: User | null
  expandedId: number | null
  onToggleExpand: (id: number) => void
  onEdit: (item: GItemEntry) => void
}

export function GItemsTable({ items, user, expandedId, onToggleExpand, onEdit }: Props) {
  const isAdmin = user?.role === 'admin'

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
          const isOpen = expandedId === it.id
          return (
            <TableRow
              key={it.id}
              className={`hover:bg-gray-50 cursor-pointer ${isOpen ? 'bg-blue-50' : ''}`}
              onClick={() => onToggleExpand(it.id)}
            >
              <TableCell>
                <span className="p-1 rounded">
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
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
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(it)
                    }}
                  >
                    <Pencil size={12} /> Edit
                  </Button>
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
