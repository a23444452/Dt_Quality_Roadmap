import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import type { DashboardSummary } from '@/types/dashboard'
import { KpiCards } from './KpiCards'
import { PlantCoverageTable } from './PlantCoverageTable'
import { SankeyChart } from '@/components/charts/SankeyChart'

export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<DashboardSummary>>('/dashboard/summary')
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <KpiCards data={data.kpi} />
      <div className="rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold mb-4">Solution Flow</h2>
        <SankeyChart data={data.sankey} />
      </div>
      <PlantCoverageTable data={data.kpi.coverage_by_plant} />
    </div>
  )
}
