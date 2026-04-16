import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'

interface DefectItem {
  name: string
  count: number
  category?: string
}

interface DefectAnalysisData {
  by_type: DefectItem[]
  by_category: DefectItem[]
  by_station?: DefectItem[]
}

function buildBarOption(title: string, items: DefectItem[], colorOffset = 0) {
  const palette = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272']
  return {
    title: { text: title, left: 'center', textStyle: { fontSize: 14, fontWeight: 'bold' } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: items.map((i) => i.name),
      axisLabel: { rotate: items.length > 6 ? 30 : 0, interval: 0 },
    },
    yAxis: { type: 'value', name: 'Count' },
    series: [
      {
        type: 'bar',
        data: items.map((i, idx) => ({
          value: i.count,
          itemStyle: { color: palette[(idx + colorOffset) % palette.length] },
        })),
        label: { show: true, position: 'top' },
      },
    ],
  }
}

export function DefectAnalysisPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['defect-analysis'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<DefectAnalysisData>>('/dashboard/defect-analysis')
      return resp.data.data!
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading defect analysis...
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center py-24 text-destructive">
        Failed to load defect analysis data.
      </div>
    )
  }

  const hasData = data.by_type?.length > 0 || data.by_category?.length > 0

  if (!hasData) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        No defect data available.
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Defect Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">Distribution of defects by type and category</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {data.by_type?.length > 0 && (
          <div className="rounded-lg border bg-white p-4">
            <ReactECharts
              option={buildBarOption('Defects by Type', data.by_type, 0)}
              style={{ height: 350 }}
              notMerge
            />
          </div>
        )}

        {data.by_category?.length > 0 && (
          <div className="rounded-lg border bg-white p-4">
            <ReactECharts
              option={buildBarOption('Defects by Category', data.by_category, 2)}
              style={{ height: 350 }}
              notMerge
            />
          </div>
        )}

        {data.by_station && data.by_station.length > 0 && (
          <div className="rounded-lg border bg-white p-4 xl:col-span-2">
            <ReactECharts
              option={buildBarOption('Defects by Station', data.by_station, 4)}
              style={{ height: 350 }}
              notMerge
            />
          </div>
        )}
      </div>
    </div>
  )
}
