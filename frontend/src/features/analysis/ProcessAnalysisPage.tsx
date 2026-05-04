import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import { X } from 'lucide-react'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface SolutionDetail {
  name: string
  mp_lines: string[]
}

interface ProcessNode {
  process_category: string
  process: string
  station: string
  station_id: number
  sort_order: number
  solution_count: number
  solutions: SolutionDetail[]
}

interface PlantOption {
  id: number
  name: string
}

interface ProcessAnalysisData {
  nodes: ProcessNode[]
  plants: PlantOption[]
}

interface SelectedStation {
  process: string
  station: string
  solutions: SolutionDetail[]
}

function buildGroupedBarOption(nodes: ProcessNode[]) {
  const processes = Array.from(new Set(nodes.map((n) => n.process)))
  const palette = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4']

  const processTotals: Record<string, number> = {}
  nodes.forEach((n) => {
    processTotals[n.process] = (processTotals[n.process] ?? 0) + n.solution_count
  })
  const totalSolutions = Object.values(processTotals).reduce((a, b) => a + b, 0)
  const subtitleParts = processes.map((p) => `${p}: ${processTotals[p]}`)

  return {
    title: {
      text: 'Solutions per Station by Process',
      subtext: `Total: ${totalSolutions} | ${subtitleParts.join(' | ')}`,
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 'bold' },
      subtextStyle: { fontSize: 12, color: '#666' },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ seriesName: string; name: string; value: number; color: string }>) => {
        const items = params.filter((p) => p.value > 0)
        if (items.length === 0) return ''
        const station = items[0].name
        let html = `<strong>${station}</strong><br/>`
        items.forEach((item) => {
          html += `<span style="display:inline-block;width:10px;height:10px;background:${item.color};border-radius:50%;margin-right:5px;"></span>${item.seriesName}: ${item.value}<br/>`
        })
        return html
      },
    },
    legend: { bottom: 0, data: processes },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: nodes.map((n) => n.station),
      axisLabel: { rotate: 45, interval: 0, fontSize: 11 },
    },
    yAxis: { type: 'value', name: 'Solutions' },
    series: processes.map((proc, idx) => ({
      name: proc,
      type: 'bar',
      stack: 'total',
      data: nodes.map((n) => (n.process === proc ? n.solution_count : 0)),
      itemStyle: { color: palette[idx % palette.length] },
      label: {
        show: true,
        position: 'inside',
        formatter: (p: { value: number }) => (p.value > 0 ? p.value : ''),
        fontSize: 10,
        color: '#fff',
      },
    })),
  }
}

export function ProcessAnalysisPage() {
  const [plantId, setPlantId] = useState<number | undefined>(undefined)
  const [selectedStation, setSelectedStation] = useState<SelectedStation | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['process-analysis', plantId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (plantId) params.append('plant_id', String(plantId))
      const resp = await apiClient.get<ApiResponse<ProcessAnalysisData>>(`/dashboard/process-analysis?${params}`)
      return resp.data.data!
    },
  })

  const selectedPlantName = useMemo(() => {
    if (!plantId) return 'All Plants'
    return data?.plants?.find((p) => p.id === plantId)?.name ?? 'All Plants'
  }, [plantId, data?.plants])

  const processSummary = useMemo(() => {
    if (!data?.nodes) return []
    const totals: Record<string, number> = {}
    data.nodes.forEach((n) => {
      totals[n.process] = (totals[n.process] ?? 0) + n.solution_count
    })
    return Object.entries(totals).map(([process, total]) => ({ process, total }))
  }, [data?.nodes])

  const totalSolutions = processSummary.reduce((sum, p) => sum + p.total, 0)

  const handleStationClick = (node: ProcessNode) => {
    if (node.solutions.length > 0) {
      setSelectedStation({
        process: node.process,
        station: node.station,
        solutions: node.solutions,
      })
    }
  }

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
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Process Analysis</h1>
            <p className="text-sm text-muted-foreground mt-1">Solution coverage across processes and stations</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Plant:</span>
            <Select
              value={plantId ? String(plantId) : 'all'}
              onValueChange={(v) => {
                setPlantId(v === 'all' ? undefined : Number(v))
                setSelectedStation(null)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Plants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plants</SelectItem>
                {data.plants?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          No process data available for the selected plant.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Process Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">Solution coverage across processes and stations</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Plant:</span>
          <Select
            value={plantId ? String(plantId) : 'all'}
            onValueChange={(v) => {
              setPlantId(v === 'all' ? undefined : Number(v))
              setSelectedStation(null)
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Plants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plants</SelectItem>
              {data.plants?.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bar Chart - Full Width */}
      <div className="rounded-lg border bg-white p-4">
        <ReactECharts
          option={buildGroupedBarOption(data.nodes)}
          style={{ height: 450 }}
          notMerge
        />
      </div>

      {/* Summary Table and Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Summary Table - Left Side */}
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Summary Table</h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{totalSolutions}</span>
              </span>
              {processSummary.map((p) => (
                <span key={p.process} className="text-muted-foreground">
                  {p.process}: <span className="font-semibold text-foreground">{p.total}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-auto max-h-[400px]">
            <table className="text-sm w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b">
                  <th className="text-left py-2 px-4 font-medium text-muted-foreground bg-gray-50">Process</th>
                  <th className="text-left py-2 px-4 font-medium text-muted-foreground bg-gray-50">Station</th>
                  <th className="text-right py-2 px-4 font-medium text-muted-foreground bg-gray-50">Solutions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.nodes.map((n) => (
                  <tr
                    key={n.station_id}
                    className={`hover:bg-gray-50 ${selectedStation?.station === n.station ? 'bg-blue-50' : ''}`}
                  >
                    <td className="py-2.5 px-4">{n.process}</td>
                    <td className="py-2.5 px-4">{n.station}</td>
                    <td className="py-2.5 px-4 text-right">
                      {n.solutions.length > 0 ? (
                        <button
                          onClick={() => handleStationClick(n)}
                          className="font-medium text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-2 cursor-pointer"
                        >
                          {n.solution_count}
                        </button>
                      ) : (
                        <span className="font-medium">{n.solution_count}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Card - Right Side */}
        <div>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Solution Details</CardTitle>
                {selectedStation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setSelectedStation(null)}
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedStation ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Plant</p>
                      <p className="font-medium">{selectedPlantName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Process</p>
                      <p className="font-medium">{selectedStation.process}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Station</p>
                      <p className="font-medium">{selectedStation.station}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">
                      Solutions ({selectedStation.solutions.length})
                    </p>
                    <div className="max-h-[300px] overflow-y-auto border rounded-md p-2 bg-gray-50">
                      <ul className="space-y-3 text-sm">
                        {selectedStation.solutions.map((sol, idx) => (
                          <li key={idx} className="border-b last:border-b-0 pb-2 last:pb-0">
                            <div className="flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">•</span>
                              <span className="font-medium">{sol.name}</span>
                            </div>
                            {sol.mp_lines.length > 0 && (
                              <div className="ml-4 mt-1">
                                <span className="text-xs text-green-600 font-medium">MP: </span>
                                <span className="text-xs text-gray-600">{sol.mp_lines.join(', ')}</span>
                              </div>
                            )}
                            {sol.mp_lines.length === 0 && (
                              <div className="ml-4 mt-1">
                                <span className="text-xs text-gray-400">No MP yet</span>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
                  <p className="text-sm">Click on a Solutions number</p>
                  <p className="text-sm">to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
