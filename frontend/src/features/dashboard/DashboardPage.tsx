import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import type { DashboardSummary } from '@/types/dashboard'
import { KpiCards } from './KpiCards'
import { PlantCoverageTable } from './PlantCoverageTable'
import { SankeyChart } from '@/components/charts/SankeyChart'

interface Filters {
  defect_category_id?: number
  process_id?: number
}

export function DashboardPage() {
  const [filters, setFilters] = useState<Filters>({})

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-summary', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.defect_category_id) params.append('defect_category_id', String(filters.defect_category_id))
      if (filters.process_id) params.append('process_id', String(filters.process_id))
      const resp = await apiClient.get<ApiResponse<DashboardSummary>>(`/dashboard/summary?${params}`)
      return resp.data.data!
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading dashboard…
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center py-24 text-destructive">
        Failed to load dashboard data.
      </div>
    )
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    const numVal = value === '' ? undefined : Number(value)
    setFilters((prev) => ({ ...prev, [key]: numVal }))
  }

  const handleReset = () => {
    setFilters({})
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <KpiCards data={data.kpi} />
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Solution Flow</h2>
          <p className="text-sm text-gray-500">Defect Category → Defect Type → D^t Solution → Plant</p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 items-center mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Defect Category</label>
            <select
              className="border rounded px-2 py-1.5 text-sm min-w-[160px] bg-white"
              value={filters.defect_category_id ?? ''}
              onChange={(e) => handleFilterChange('defect_category_id', e.target.value)}
            >
              <option value="">All Categories</option>
              {data.filter_options.defect_categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Process</label>
            <select
              className="border rounded px-2 py-1.5 text-sm min-w-[140px] bg-white"
              value={filters.process_id ?? ''}
              onChange={(e) => handleFilterChange('process_id', e.target.value)}
            >
              <option value="">All Processes</option>
              {data.filter_options.processes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium invisible">Reset</label>
            <button
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </div>

        <SankeyChart data={data.sankey} />
      </div>
      <PlantCoverageTable data={data.kpi.coverage_by_plant} />
    </div>
  )
}
