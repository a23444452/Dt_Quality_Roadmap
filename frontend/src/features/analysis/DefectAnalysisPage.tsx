import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'

interface AnalysisItem {
  label: string
  count: number
}

interface AnalysisResponse {
  group_by: string
  data: AnalysisItem[]
}

function buildBarOption(title: string, items: AnalysisItem[], colorOffset = 0) {
  const palette = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272']
  return {
    title: { text: title, left: 'center', textStyle: { fontSize: 14, fontWeight: 'bold' } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: items.map((i) => i.label),
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

async function fetchAnalysis(groupBy: string) {
  const resp = await apiClient.get<ApiResponse<AnalysisResponse>>('/dashboard/defect-analysis', {
    params: { group_by: groupBy },
  })
  return resp.data.data!
}

export function DefectAnalysisPage() {
  const { data: byCategory, isLoading: loadingCat } = useQuery({
    queryKey: ['defect-analysis', 'defect_category'],
    queryFn: () => fetchAnalysis('defect_category'),
  })

  const { data: byType, isLoading: loadingType } = useQuery({
    queryKey: ['defect-analysis', 'defect_type'],
    queryFn: () => fetchAnalysis('defect_type'),
  })

  const isLoading = loadingCat || loadingType

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading defect analysis...
      </div>
    )
  }

  const catItems = byCategory?.data ?? []
  const typeItems = byType?.data ?? []
  const hasData = catItems.length > 0 || typeItems.length > 0

  if (!hasData) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Defect Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">Distribution of defects by type and category</p>
        </div>
        <div className="flex items-center justify-center py-24 text-muted-foreground rounded-lg border bg-white">
          No defect data available. Add solutions and solution map entries first.
        </div>
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
        {catItems.length > 0 && (
          <div className="rounded-lg border bg-white p-4">
            <ReactECharts
              option={buildBarOption('Defects by Category', catItems, 0)}
              style={{ height: 350 }}
              notMerge
            />
          </div>
        )}

        {typeItems.length > 0 && (
          <div className="rounded-lg border bg-white p-4">
            <ReactECharts
              option={buildBarOption('Defects by Type', typeItems, 2)}
              style={{ height: 350 }}
              notMerge
            />
          </div>
        )}
      </div>
    </div>
  )
}
