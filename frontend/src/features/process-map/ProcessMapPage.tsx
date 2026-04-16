import { useState } from 'react'
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

interface StationDetail {
  station: string
  solutions: Array<{ id: number; name: string; defect_type: string; status: string }>
}

const PROCESS_COLORS: Record<string, string> = {
  System: '#5470c6',
  Melting: '#91cc75',
  Finishing: '#fac858',
}

function buildGraphOption(nodes: ProcessNode[]) {
  const processes = Array.from(new Set(nodes.map((n) => n.process)))
  const processCount = processes.length || 1

  const graphNodes = nodes.map((n) => {
    const pIdx = processes.indexOf(n.process)
    const nodesInProcess = nodes.filter((x) => x.process === n.process)
    const posInProcess = nodesInProcess.indexOf(n)
    const total = nodesInProcess.length
    const xPos = ((pIdx + 0.5) / processCount) * 800 + 100
    const yPos = total > 1 ? (posInProcess / (total - 1)) * 300 + 100 : 250

    return {
      id: String(n.station_id),
      name: `${n.station}\n(${n.solution_count})`,
      value: n.solution_count,
      x: xPos,
      y: yPos,
      symbolSize: Math.max(40, Math.min(90, 30 + n.solution_count * 5)),
      itemStyle: { color: PROCESS_COLORS[n.process] ?? '#ee6666' },
      label: {
        show: true,
        fontSize: 11,
        fontWeight: 'bold' as const,
        color: '#fff',
        position: 'inside' as const,
      },
    }
  })

  // Connect last station of each process to first station of next process
  const links: Array<{ source: string; target: string; lineStyle?: object }> = []
  for (let p = 0; p < processes.length - 1; p++) {
    const curStations = nodes.filter((n) => n.process === processes[p])
    const nextStations = nodes.filter((n) => n.process === processes[p + 1])
    for (const cur of curStations) {
      for (const next of nextStations) {
        links.push({
          source: String(cur.station_id),
          target: String(next.station_id),
          lineStyle: { width: 1.5, curveness: 0.2, color: '#bbb' },
        })
      }
    }
  }

  return {
    tooltip: {
      trigger: 'item' as const,
      formatter: (p: { data?: { value?: number; name?: string } }) => {
        if (!p.data) return ''
        const name = (p.data.name ?? '').split('\n')[0]
        return `${name}: ${p.data.value ?? 0} solutions`
      },
    },
    series: [
      {
        type: 'graph',
        layout: 'none',
        roam: true,
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: [0, 12],
        data: graphNodes,
        links,
        lineStyle: { color: '#aaa', width: 2 },
        emphasis: { focus: 'adjacency' },
      },
    ],
    graphic: processes.map((p, i) => ({
      type: 'text',
      left: `${((i + 0.5) / processCount) * 80 + 10}%`,
      top: 10,
      style: {
        text: p,
        font: 'bold 16px sans-serif',
        fill: PROCESS_COLORS[p] ?? '#ee6666',
        textAlign: 'center',
      },
    })),
  }
}

export function ProcessMapPage() {
  const [selectedStation, setSelectedStation] = useState<StationDetail | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['process-analysis'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<ProcessAnalysisData>>('/dashboard/process-analysis')
      return resp.data.data!
    },
  })

  const handleChartClick = (params: { data?: { id?: string; name?: string } }) => {
    if (!params.data?.id || !data) return
    const stationId = Number(params.data.id)
    const node = data.nodes.find((n) => n.station_id === stationId)
    if (!node) return
    setSelectedStation({
      station: node.station,
      solutions: [],
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading process map...
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

  const nodes = data.nodes ?? []

  if (nodes.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Process Map</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Click a station node to view solution details
          </p>
        </div>
        <div className="flex items-center justify-center py-24 text-muted-foreground rounded-lg border bg-white">
          No process data available. Add solutions and solution map entries first.
        </div>
      </div>
    )
  }

  const option = buildGraphOption(nodes)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Process Map</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Click a station node to view solution details
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <ReactECharts
          option={option}
          style={{ height: 500 }}
          notMerge
          onEvents={{ click: handleChartClick }}
        />
      </div>

      {selectedStation && (
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Station: {selectedStation.station}</h2>
            <button
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedStation(null)}
            >
              Close
            </button>
          </div>
          {selectedStation.solutions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No detailed solution data available for this station.</p>
          ) : (
            <ul className="divide-y">
              {selectedStation.solutions.map((s) => (
                <li key={s.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">{s.defect_type} · {s.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
