import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useSolutionMap } from '@/hooks/useSolutionMap'
import { FilterBar } from './FilterBar'
import { PivotTable } from './PivotTable'

interface Filters {
  process_category?: string
  process_id?: number
  station_id?: number
  defect_category_id?: number
  plant_id?: number
  status_id?: number
}

export function SolutionMapPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<Filters>({})

  const canEdit = user?.role === 'editor' || user?.role === 'admin'

  const { data, isLoading, isError, error } = useSolutionMap(
    filters as Record<string, number | undefined>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Solution Map</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            View and manage solution status across tank lines
          </p>
        </div>
        {canEdit && (
          <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1">
            Click any cell to edit status
          </span>
        )}
      </div>

      <FilterBar
        filterOptions={data?.filters}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div className="flex-1 overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center h-full text-gray-400">
            Loading solution map...
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-600 font-medium">Failed to load solution map</p>
              <p className="text-sm text-gray-500 mt-1">
                {(error as Error)?.message ?? 'An unexpected error occurred'}
              </p>
            </div>
          </div>
        )}

        {data && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto">
              <PivotTable
                solutions={data.solutions}
                lines={data.lines}
                statuses={data.filters.statuses}
                canEdit={canEdit}
              />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 px-4 py-3 border-t bg-white">
              <span className="text-xs text-gray-500 font-medium self-center">Legend:</span>
              {data.filters.statuses.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-4 h-4 rounded text-xs"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-xs text-gray-600">
                    {s.code} — {s.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
