import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'

interface TrackingItem {
  plant: string
  line: string
  category: string
  status: string
  complete_date: string | null
  planned_date: string | null
  owner: string
  class: string
}

interface MonthlyTarget {
  month: string
  num: number
  budget: number
  stretch: number
  actual_cumulative: number
}

interface PlantTarget {
  plant: string
  budget: number
  stretch: number
}

interface TrackingData {
  items: TrackingItem[]
  monthly_targets: MonthlyTarget[]
  plant_targets: PlantTarget[]
}

export function GTrackingPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['g-tracking'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<TrackingData>>('/g-tracking/data')
      return resp.data.data!
    },
  })

  if (isLoading) {
    return <div className="flex items-center justify-center py-24 text-muted-foreground">Loading…</div>
  }
  if (isError || !data) {
    return <div className="flex items-center justify-center py-24 text-red-600">Failed to load tracking data.</div>
  }

  const { items, monthly_targets, plant_targets } = data

  const dtItems = items.filter((i) => i.class === 'D^t')
  const totalComplete = dtItems.filter((i) => i.status === 'Complete').length
  const totalItems = dtItems.length

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-6 py-4 border-b bg-white">
        <h1 className="text-xl font-semibold">2026 G$ Tracking</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Goal Sharing completion tracking — {totalComplete}/{totalItems} completed
        </p>
      </div>

      <div className="p-6 flex flex-col gap-6">
        <StatusTable items={items} />
        <MonthlyTrendChart monthly={monthly_targets} />
        <SolutionBarChart items={items} />
        <PlantTargetChart items={items} targets={plant_targets} />
      </div>
    </div>
  )
}

function StatusTable({ items }: { items: TrackingItem[] }) {
  const dtItems = items.filter((i) => i.class === 'D^t')
  const sortedItems = [...dtItems].sort((a, b) => {
    if (a.status === 'Complete' && b.status !== 'Complete') return -1
    if (a.status !== 'Complete' && b.status === 'Complete') return 1
    if (a.status === 'Complete' && b.status === 'Complete') {
      return (b.complete_date ?? '') > (a.complete_date ?? '') ? 1 : -1
    }
    return a.plant.localeCompare(b.plant)
  })

  return (
    <div className="rounded-lg border bg-white p-4 overflow-auto max-h-[480px]">
      <h3 className="font-semibold mb-3">2026 G$ Item Tracking List</h3>
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-gray-50">
          <tr>
            <th className="border px-2 py-1.5 text-left font-medium">Status</th>
            <th className="border px-2 py-1.5 text-left font-medium">Plant</th>
            <th className="border px-2 py-1.5 text-left font-medium">Complete Date</th>
            <th className="border px-2 py-1.5 text-left font-medium">Line/Tank(BOD)</th>
            <th className="border px-2 py-1.5 text-left font-medium">Category</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border px-2 py-1">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    item.status === 'Complete'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.status}
                </span>
              </td>
              <td className="border px-2 py-1">{item.plant}</td>
              <td className="border px-2 py-1">{item.complete_date ?? '—'}</td>
              <td className="border px-2 py-1">{item.line}</td>
              <td className="border px-2 py-1">{item.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MonthlyTrendChart({ monthly }: { monthly: MonthlyTarget[] }) {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const lastDayOfCurrentMonth = new Date(now.getFullYear(), currentMonth, 0).getDate()
  const isEndOfMonth = now.getDate() === lastDayOfCurrentMonth
  const lastCompleteMonth = isEndOfMonth ? currentMonth : currentMonth - 1

  const months = monthly.map((m) => m.month)
  const budgetData = monthly.map((m) => Math.round(m.budget))
  const stretchData = monthly.map((m) => Math.round(m.stretch))
  const actualData = monthly.map((m, idx) =>
    idx < lastCompleteMonth ? m.actual_cumulative : null,
  )

  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Sum_complete_GS', 'Stretch', 'Budget'], top: 0 },
    grid: { left: 50, right: 30, top: 50, bottom: 30 },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value', name: 'Cumulative Count' },
    series: [
      {
        name: 'Sum_complete_GS',
        type: 'bar',
        data: actualData,
        itemStyle: { color: '#5b9bd5' },
        barWidth: '40%',
        label: { show: true, position: 'inside', fontSize: 11, color: '#000', fontWeight: 'bold' },
      },
      {
        name: 'Stretch',
        type: 'line',
        data: stretchData,
        itemStyle: { color: '#70ad47' },
        lineStyle: { width: 2, color: '#70ad47' },
        symbol: 'circle',
        symbolSize: 6,
        label: { show: true, position: 'top', fontSize: 10, color: '#70ad47' },
      },
      {
        name: 'Budget',
        type: 'line',
        data: budgetData,
        itemStyle: { color: '#2f5496' },
        lineStyle: { width: 2, color: '#2f5496' },
        symbol: 'circle',
        symbolSize: 6,
        label: { show: true, position: 'bottom', fontSize: 10, color: '#2f5496' },
      },
    ],
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="font-semibold mb-2">Quality Roadmap Cumulative Completion Chart</h3>
      <ReactECharts option={option} style={{ height: 400 }} />
    </div>
  )
}

function SolutionBarChart({ items }: { items: TrackingItem[] }) {
  const categoryMap: Record<string, { complete: number; notComplete: number }> = {}
  for (const item of items) {
    if (!categoryMap[item.category]) {
      categoryMap[item.category] = { complete: 0, notComplete: 0 }
    }
    if (item.status === 'Complete') {
      categoryMap[item.category].complete++
    } else {
      categoryMap[item.category].notComplete++
    }
  }

  const categories = Object.keys(categoryMap).sort(
    (a, b) =>
      categoryMap[b].complete + categoryMap[b].notComplete -
      (categoryMap[a].complete + categoryMap[a].notComplete),
  )
  const completeData = categories.map((c) => categoryMap[c].complete)
  const notCompleteData = categories.map((c) => categoryMap[c].notComplete)

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Complete', 'Not Complete'], top: 0 },
    grid: { left: 200, right: 40, top: 40, bottom: 30 },
    yAxis: {
      type: 'category',
      data: categories,
      axisLabel: { fontSize: 11, width: 180, overflow: 'truncate' },
      inverse: true,
    },
    xAxis: { type: 'value', name: 'Count' },
    series: [
      {
        name: 'Complete',
        type: 'bar',
        stack: 'total',
        data: completeData,
        itemStyle: { color: '#5b9bd5' },
        label: {
          show: true,
          position: 'inside',
          fontSize: 10,
          formatter: (params: { value: number }) => (params.value > 0 ? String(params.value) : ''),
        },
      },
      {
        name: 'Not Complete',
        type: 'bar',
        stack: 'total',
        data: notCompleteData,
        itemStyle: { color: '#c0c0c0' },
        label: {
          show: true,
          position: 'inside',
          fontSize: 10,
          formatter: (params: { value: number }) => (params.value > 0 ? String(params.value) : ''),
        },
      },
    ],
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="font-semibold mb-2">Retrofit view: Quality Roadmap Cumulative Completion</h3>
      <ReactECharts option={option} style={{ height: 500 }} />
    </div>
  )
}

function PlantTargetChart({ items, targets }: { items: TrackingItem[]; targets: PlantTarget[] }) {
  const plantCompletions: Record<string, { complete: number; notComplete: number }> = {}
  for (const item of items) {
    if (!plantCompletions[item.plant]) {
      plantCompletions[item.plant] = { complete: 0, notComplete: 0 }
    }
    if (item.status === 'Complete') {
      plantCompletions[item.plant].complete++
    } else {
      plantCompletions[item.plant].notComplete++
    }
  }

  const targetMap = Object.fromEntries(targets.map((t) => [t.plant, t]))
  const plants = targets
    .map((t) => t.plant)
    .sort((a, b) => {
      const totalA = (plantCompletions[a]?.complete ?? 0) + (plantCompletions[a]?.notComplete ?? 0)
      const totalB = (plantCompletions[b]?.complete ?? 0) + (plantCompletions[b]?.notComplete ?? 0)
      return totalB - totalA
    })
  const completeData = plants.map((p) => plantCompletions[p]?.complete ?? 0)
  const notCompleteData = plants.map((p) => plantCompletions[p]?.notComplete ?? 0)
  const budgetData = plants.map((p) => targetMap[p]?.budget ?? 0)
  const stretchData = plants.map((p) => targetMap[p]?.stretch ?? 0)

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Complete', 'Not Complete', 'Stretch', 'Budget'], top: 0 },
    grid: { left: 50, right: 30, top: 50, bottom: 30 },
    xAxis: { type: 'category', data: plants },
    yAxis: { type: 'value', name: 'Count' },
    series: [
      {
        name: 'Complete',
        type: 'bar',
        stack: 'status',
        data: completeData,
        itemStyle: { color: '#5b9bd5' },
        label: { show: true, position: 'inside', fontSize: 10 },
      },
      {
        name: 'Not Complete',
        type: 'bar',
        stack: 'status',
        data: notCompleteData,
        itemStyle: { color: '#c0c0c0' },
        label: { show: true, position: 'inside', fontSize: 10 },
      },
      {
        name: 'Stretch',
        type: 'line',
        data: stretchData,
        itemStyle: { color: '#70ad47' },
        lineStyle: { width: 2, color: '#70ad47' },
        symbol: 'circle',
        symbolSize: 8,
        label: { show: true, position: 'top', fontSize: 10, color: '#70ad47' },
      },
      {
        name: 'Budget',
        type: 'line',
        data: budgetData,
        itemStyle: { color: '#2f5496' },
        lineStyle: { width: 2, color: '#2f5496' },
        symbol: 'circle',
        symbolSize: 8,
        label: { show: true, position: 'bottom', fontSize: 10, color: '#2f5496' },
      },
    ],
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="font-semibold mb-2">Plant view: Quality Roadmap Cumulative Completion</h3>
      <ReactECharts option={option} style={{ height: 400 }} />
    </div>
  )
}
