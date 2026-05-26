import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { GItemsFilterBar } from './GItemsFilterBar'
import { GItemsTable } from './GItemsTable'
import { GItemEditDialog } from './GItemEditDialog'
import { useGItems } from './useGItems'
import type { GItemEntry, GItemFilters } from './types'
import type { ApiResponse } from '@/types/api'

interface ReferenceOption {
  id: number
  name: string
}

interface ReferenceOptions {
  plants: ReferenceOption[]
  processes: ReferenceOption[]
}

interface StatusOption {
  id: number
  code: string
  name: string
  color: string
}

export function GItemsPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<GItemFilters>({ page: 1, limit: 50 })
  const [editing, setEditing] = useState<GItemEntry | null>(null)

  const { data: refOptions } = useQuery({
    queryKey: ['reference-options'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<ReferenceOptions>>('/reference/options')
      return resp.data.data ?? { plants: [], processes: [] }
    },
  })

  const { data: statuses } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<StatusOption[]>>('/statuses')
      return resp.data.data ?? []
    },
  })

  const { data, isLoading, isError } = useGItems(filters)
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const page = data?.page ?? 1
  const limit = data?.limit ?? 50
  const pageCount = Math.max(1, Math.ceil(total / limit))

  function setPage(next: number) {
    setFilters((f) => ({ ...f, page: next }))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b bg-white">
        <h1 className="text-xl font-semibold">G$ Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage and track Goal Sharing items
        </p>
      </div>

      <GItemsFilterBar
        plants={refOptions?.plants ?? []}
        processes={refOptions?.processes ?? []}
        filters={filters}
        onChange={setFilters}
      />

      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        )}
        {isError && (
          <div className="py-12 text-center text-sm text-red-600">
            Failed to load G$ items.
          </div>
        )}
        {!isLoading && !isError && (
          <GItemsTable
            items={items}
            user={user}
            statuses={statuses ?? []}
            selectedPlantIds={filters.plant_ids}
            onEdit={setEditing}
          />
        )}
      </div>

      {total > 0 && (
        <div className="border-t bg-white px-6 py-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} G$ item{total === 1 ? '' : 's'} · Page {page} of {pageCount}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <GItemEditDialog
        open={!!editing}
        item={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
