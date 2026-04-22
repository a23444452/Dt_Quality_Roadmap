import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'

interface ProcessNode {
  process_category: string
  process: string
  station: string
  station_id: number
  sort_order: number
  solution_count: number
}

interface ProcessAnalysisData {
  nodes: ProcessNode[]
}

interface StationDetail {
  station: string
  solutions: Array<{ id: number; name: string; defect_type: string; status: string }>
}

// Colors for process categories
const CATEGORY_COLORS: Record<string, string> = {
  Melting: '#91cc75',
  Finishing: '#fac858',
  System: '#5470c6',
}

// Colors for individual processes
const PROCESS_COLORS: Record<string, string> = {
  Melting: '#91cc75',
  Forming: '#73c0de',
  BOD: '#3ba272',
  CBW: '#fac858',
  INSP: '#ee6666',
  DP: '#9a60b4',
  System: '#5470c6',
}

function buildGraphOption(nodes: ProcessNode[]) {
  // Nodes are already sorted by sort_order (production flow sequence)
  const sortedNodes = [...nodes].sort((a, b) => a.sort_order - b.sort_order)

  // Layout: arrange in columns, snake pattern for better visualization
  const nodesPerColumn = 10
  const columnWidth = 180
  const rowHeight = 60
  const startX = 80
  const startY = 80

  const graphNodes = sortedNodes.map((n, idx) => {
    const col = Math.floor(idx / nodesPerColumn)
    const rowInCol = idx % nodesPerColumn
    // Snake pattern: odd columns go bottom-to-top
    const row = col % 2 === 0 ? rowInCol : nodesPerColumn - 1 - rowInCol
    const xPos = startX + col * columnWidth
    const yPos = startY + row * rowHeight

    return {
      id: String(n.station_id),
      name: n.station,
      value: n.solution_count,
      x: xPos,
      y: yPos,
      symbolSize: Math.max(35, Math.min(70, 25 + n.solution_count * 3)),
      itemStyle: { color: PROCESS_COLORS[n.process] ?? CATEGORY_COLORS[n.process_category] ?? '#666' },
      label: {
        show: true,
        fontSize: 10,
        fontWeight: 'bold' as const,
        color: '#fff',
        position: 'inside' as const,
        formatter: () => n.station.length > 8 ? n.station.substring(0, 7) + '..' : n.station,
      },
      // Store extra data for tooltip
      processCategory: n.process_category,
      process: n.process,
      sortOrder: n.sort_order,
    }
  })

  // Connect sequential stations (production flow)
  const links: Array<{ source: string; target: string; lineStyle?: object }> = []
  for (let i = 0; i < sortedNodes.length - 1; i++) {
    links.push({
      source: String(sortedNodes[i].station_id),
      target: String(sortedNodes[i + 1].station_id),
      lineStyle: {
        width: 2,
        curveness: 0.2,
        color: sortedNodes[i].process === sortedNodes[i + 1].process ? '#aaa' : '#ddd',
      },
    })
  }

  // Get unique process categories for legend
  const categories = Array.from(new Set(sortedNodes.map((n) => n.process_category)))

  return {
    tooltip: {
      trigger: 'item' as const,
      formatter: (p: { data?: { value?: number; name?: string; process?: string; processCategory?: string; sortOrder?: number } }) => {
        if (!p.data) return ''
        return `<b>${p.data.name}</b><br/>
                Process: ${p.data.process}<br/>
                Category: ${p.data.processCategory}<br/>
                Solutions: ${p.data.value ?? 0}<br/>
                Flow Order: #${p.data.sortOrder}`
      },
    },
    legend: {
      data: Object.keys(PROCESS_COLORS),
      top: 10,
      left: 'center',
    },
    series: [
      {
        type: 'graph',
        layout: 'none',
        roam: true,
        zoom: 0.9,
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: [0, 8],
        data: graphNodes,
        links,
        lineStyle: { color: '#aaa', width: 2 },
        emphasis: { focus: 'adjacency' },
      },
    ],
    // Category labels on the side
    graphic: categories.map((cat, i) => ({
      type: 'text',
      right: 20,
      top: 60 + i * 25,
      style: {
        text: `● ${cat}`,
        font: 'bold 12px sans-serif',
        fill: CATEGORY_COLORS[cat] ?? '#666',
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
