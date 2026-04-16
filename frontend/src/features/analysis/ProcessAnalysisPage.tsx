import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'

interface ProcessNode {
  process: string
  station: string
  station_id: number
  solution_count: number
}

interface ProcessAnalysisData {
  nodes: ProcessNode[]
}

function buildGroupedBarOption(nodes: ProcessNode[]) {
  const processes = Array.from(new Set(nodes.map((n) => n.process)))
  const palette = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de']

  return {
    title: { text: 'Solutions per Station by Process', left: 'center', textStyle: { fontSize: 14, fontWeight: 'bold' } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0, data: processes },
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: nodes.map((n) => n.station),
      axisLabel: { rotate: 30, interval: 0 },
    },
    yAxis: { type: 'value', name: 'Solutions' },
    series: processes.map((proc, idx) => ({
      name: proc,
      type: 'bar',
      data: nodes.map((n) => (n.process === proc ? n.solution_count : 0)),
      itemStyle: { color: palette[idx % palette.length] },
      label: { show: true, position: 'top', formatter: (p: { value: number }) => p.value > 0 ? p.value : '' },
    })),
  }
}

function buildPieOption(nodes: ProcessNode[]) {
  const byProcess: Record<string, number> = {}
  nodes.forEach((n) => {
    byProcess[n.process] = (byProcess[n.process] ?? 0) + n.solution_count
  })

  return {
    title: { text: 'Solution Distribution by Process', left: 'center', textStyle: { fontSize: 14, fontWeight: 'bold' } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: Object.entries(byProcess).map(([name, value]) => ({ name, value })),
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } },
        label: { formatter: '{b}\n{c}' },
      },
    ],
  }
}

export function ProcessAnalysisPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['process-analysis'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<ProcessAnalysisData>>('/dashboard/process-analysis')
      return resp.data.data!
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading process analysis...
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center py-24 text-destructive">
        Failed to load process analysis data.
      </div>
    )
  }

  if (!data.nodes || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        No process data available.
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Process Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">Solution coverage across processes and stations</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-white p-4 xl:col-span-2">
          <ReactECharts
            option={buildGroupedBarOption(data.nodes)}
            style={{ height: 400 }}
            notMerge
          />
        </div>

        <div className="rounded-lg border bg-white p-4">
          <ReactECharts
            option={buildPieOption(data.nodes)}
            style={{ height: 350 }}
            notMerge
          />
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">Summary Table</h3>
          <div className="overflow-auto">
            <table className="text-sm w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 pr-4 font-medium text-muted-foreground">Process</th>
                  <th className="text-left py-1 pr-4 font-medium text-muted-foreground">Station</th>
                  <th className="text-right py-1 font-medium text-muted-foreground">Solutions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.nodes.map((n) => (
                  <tr key={n.station_id}>
                    <td className="py-1.5 pr-4">{n.process}</td>
                    <td className="py-1.5 pr-4">{n.station}</td>
                    <td className="py-1.5 text-right font-medium">{n.solution_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
