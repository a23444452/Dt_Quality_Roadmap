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
  const processCount = processes.length

  const graphNodes = nodes.map((n, i) => {
    const pIdx = processes.indexOf(n.process)
    const nodesInProcess = nodes.filter((x) => x.process === n.process)
    const posInProcess = nodesInProcess.indexOf(n)
    const total = nodesInProcess.length
    const xBase = (pIdx + 0.5) / processCount
    const ySpread = total > 1 ? (posInProcess / (total - 1)) * 0.6 + 0.2 : 0.5

    return {
      id: String(n.station_id),
      name: n.station,
      value: n.solution_count,
      x: xBase * 1000,
      y: ySpread * 600,
      symbolSize: Math.max(30, Math.min(80, 20 + n.solution_count * 4)),
      itemStyle: { color: PROCESS_COLORS[n.process] ?? '#ee6666' },
      label: { show: true, formatter: `{a|${n.station}}\n{b|${n.solution_count}}` },
      category: pIdx,
    }
  })

  const links: Array<{ source: string; target: string }> = []
  for (let p = 0; p < processes.length - 1; p++) {
    const cur = nodes.filter((n) => n.process === processes[p])
    const next = nodes.filter((n) => n.process === processes[p + 1])
    if (cur.length && next.length) {
      links.push({
        source: String(cur[0].station_id),
        target: String(next[0].station_id),
      })
    }
  }

  return {
    tooltip: { trigger: 'item', formatter: (p: { data: { name: string; value: number } }) => `${p.data.name}: ${p.data.value} solutions` },
    legend: {
      data: processes.map((p) => ({ name: p, itemStyle: { color: PROCESS_COLORS[p] ?? '#ee6666' } })),
    },
    series: [
      {
        type: 'graph',
        layout: 'none',
        symbolSize: 50,
        roam: true,
        label: {
          show: true,
          rich: {
            a: { fontSize: 12, fontWeight: 'bold', color: '#333' },
            b: { fontSize: 10, color: '#666' },
          },
        },
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: [0, 10],
        data: graphNodes,
        links,
        lineStyle: { color: '#aaa', width: 2, curveness: 0.1 },
        emphasis: { focus: 'adjacency' },
      },
    ],
    graphic: processes.map((p, i) => ({
      type: 'text',
      left: `${((i + 0.5) / processCount) * 100}%`,
      top: 16,
      style: {
        text: p,
        font: 'bold 14px sans-serif',
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

  const option = buildGraphOption(data.nodes)

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
