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
  defect_type_id?: number
  solution_id?: number
  plant_id?: number
  process_id?: number
}

export function DashboardPage() {
  const [filters, setFilters] = useState<Filters>({})

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-summary', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.defect_category_id) params.append('defect_category_id', String(filters.defect_category_id))
      if (filters.defect_type_id) params.append('defect_type_id', String(filters.defect_type_id))
      if (filters.solution_id) params.append('solution_id', String(filters.solution_id))
      if (filters.plant_id) params.append('plant_id', String(filters.plant_id))
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
    if (key === 'defect_category_id') {
      setFilters((prev) => ({ ...prev, defect_category_id: numVal, defect_type_id: undefined, solution_id: undefined }))
    } else if (key === 'defect_type_id') {
      setFilters((prev) => ({ ...prev, defect_type_id: numVal, solution_id: undefined }))
    } else {
      setFilters((prev) => ({ ...prev, [key]: numVal }))
    }
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
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1 rounded-full font-medium" style={{ backgroundColor: '#5470c6', color: '#fff' }}>Defect Category</span>
            <span className="text-gray-400 font-bold">→</span>
            <span className="px-3 py-1 rounded-full font-medium" style={{ backgroundColor: '#91cc75', color: '#1a5d1a' }}>Defect Type</span>
            <span className="text-gray-400 font-bold">→</span>
            <span className="px-3 py-1 rounded-full font-medium" style={{ backgroundColor: '#fac858', color: '#7c5c00' }}>D^t Solution</span>
            <span className="text-gray-400 font-bold">→</span>
            <span className="px-3 py-1 rounded-full font-medium" style={{ backgroundColor: '#ee6666', color: '#fff' }}>Plant</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 items-center mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Defect Category</label>
            <select
              className="border rounded px-2 py-1.5 text-sm min-w-[150px] bg-white"
              value={filters.defect_category_id ?? ''}
              onChange={(e) => handleFilterChange('defect_category_id', e.target.value)}
            >
              <option value="">All</option>
              {data.filter_options.defect_categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Defect Type</label>
            <select
              className="border rounded px-2 py-1.5 text-sm min-w-[150px] bg-white"
              value={filters.defect_type_id ?? ''}
              onChange={(e) => handleFilterChange('defect_type_id', e.target.value)}
            >
              <option value="">All</option>
              {data.filter_options.defect_types
                .filter((t) => !filters.defect_category_id || t.category_id === filters.defect_category_id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">D^t Solution</label>
            <select
              className="border rounded px-2 py-1.5 text-sm min-w-[150px] bg-white"
              value={filters.solution_id ?? ''}
              onChange={(e) => handleFilterChange('solution_id', e.target.value)}
            >
              <option value="">All</option>
              {data.filter_options.solutions
                .filter((s) => !filters.defect_type_id || s.defect_type_id === filters.defect_type_id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Plant</label>
            <select
              className="border rounded px-2 py-1.5 text-sm min-w-[120px] bg-white"
              value={filters.plant_id ?? ''}
              onChange={(e) => handleFilterChange('plant_id', e.target.value)}
            >
              <option value="">All</option>
              {data.filter_options.plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Process</label>
            <select
              className="border rounded px-2 py-1.5 text-sm min-w-[120px] bg-white"
              value={filters.process_id ?? ''}
              onChange={(e) => handleFilterChange('process_id', e.target.value)}
            >
              <option value="">All</option>
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
