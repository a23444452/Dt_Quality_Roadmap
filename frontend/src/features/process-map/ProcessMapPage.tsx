import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import { ProcessHotspot } from './ProcessHotspot'
import { useProcessSolutions } from './useProcessSolutions'
import { PROCESS_ZONES, PROCESS_COLORS, type ProcessZone } from './process-hotspots'

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

export function ProcessMapPage() {
  const [selectedZone, setSelectedZone] = useState<ProcessZone | null>(null)
  const [selectedProcessName, setSelectedProcessName] = useState<string | null>(null)

  const { data: processData, isLoading: processLoading, isError } = useQuery({
    queryKey: ['process-analysis'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<ProcessAnalysisData>>('/dashboard/process-analysis')
      return resp.data.data!
    },
  })

  // 按 Process 分組站點資訊
  const processStationMap = useMemo(() => {
    if (!processData?.nodes) return new Map<string, Array<{ name: string; stationId: number; solutionCount: number }>>()

    const map = new Map<string, Array<{ name: string; stationId: number; solutionCount: number }>>()

    processData.nodes.forEach((node) => {
      const existing = map.get(node.process) ?? []
      existing.push({
        name: node.station,
        stationId: node.station_id,
        solutionCount: node.solution_count,
      })
      map.set(node.process, existing)
    })

    return map
  }, [processData])

  // 取得指定 Process 的站點資訊
  const getStationInfos = (zone: ProcessZone) => {
    const stations = processStationMap.get(zone.process) ?? []
    return zone.stations.map((stationName) => {
      const found = stations.find((s) =>
        s.name.toLowerCase() === stationName.toLowerCase() ||
        s.name.toLowerCase().includes(stationName.toLowerCase()) ||
        stationName.toLowerCase().includes(s.name.toLowerCase())
      )
      return {
        name: stationName,
        solutionCount: found?.solutionCount ?? 0,
        stationId: found?.stationId,
      }
    })
  }

  const { data: solutions = [], isLoading: solutionsLoading } = useProcessSolutions(selectedProcessName)

  const handleZoneClick = (zone: ProcessZone) => {
    // 如果點擊同一個 Process，則取消選取
    if (selectedZone?.id === zone.id) {
      setSelectedZone(null)
      setSelectedProcessName(null)
    } else {
      setSelectedZone(zone)
      setSelectedProcessName(zone.process)
    }
  }

  if (processLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading process map...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-24 text-destructive">
        Failed to load process analysis data.
      </div>
    )
  }

  const processColor = selectedZone ? PROCESS_COLORS[selectedZone.process] ?? '#6b7280' : '#6b7280'

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Process Map</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Process flow overview. Click on a dot to view D^t Solution details for each process.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          {Object.entries(PROCESS_COLORS).map(([process, color]) => (
            <div key={process} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>{process}</span>
            </div>
          ))}
        </div>

        {/* Process Map Image with Hotspots */}
        <div className="rounded-lg border bg-white p-4 overflow-auto flex justify-center">
          <div className="relative inline-block min-w-[1100px]">
            <img
              src="/process-map.jpg"
              alt="Process Map"
              className="w-full h-auto"
              draggable={false}
            />
            {PROCESS_ZONES.map((zone) => (
              <ProcessHotspot
                key={zone.id}
                zone={zone}
                stationInfos={getStationInfos(zone)}
                onClick={handleZoneClick}
                isSelected={selectedZone?.id === zone.id}
              />
            ))}
          </div>
        </div>

        {/* User Hint */}
        {!selectedZone && (
          <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-2">
            <span className="text-blue-500">💡</span>
            <p>Click on a <strong>process dot</strong> above to view the D^t Solution details below</p>
          </div>
        )}

        {/* D^t Solution Table */}
        {selectedZone && (
          <div className="rounded-lg border bg-white">
            {/* Table Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: processColor }}
                />
                <h2 className="text-lg font-semibold">{selectedZone.displayName}</h2>
                <Badge variant="secondary">
                  {solutions.length} Solution{solutions.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <button
                className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted"
                onClick={() => {
                  setSelectedZone(null)
                  setSelectedProcessName(null)
                }}
              >
                ✕ Close
              </button>
            </div>

            {/* Stations Info */}
            <div className="px-4 py-2 bg-muted/30 text-sm text-muted-foreground">
              <span className="font-medium">Stations:</span> {selectedZone.stations.join(', ')}
            </div>

            {/* Table Content */}
            <div className="overflow-auto max-h-[500px]">
              {solutionsLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  Loading solutions...
                </div>
              ) : solutions.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  No D^t Solution data available for this process
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Station</th>
                      <th className="text-left px-4 py-3 font-medium">Solution Name</th>
                      <th className="text-left px-4 py-3 font-medium">Quality Attribute</th>
                      <th className="text-left px-4 py-3 font-medium">MP Plants</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {solutions.map((sol) => (
                      <tr key={sol.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs font-normal">
                            {sol.station}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium">{sol.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {sol.quality_attribute || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {sol.mp_plants && sol.mp_plants.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {sol.mp_plants.map((plant) => (
                                <Badge key={plant} variant="default" className="text-xs font-normal bg-green-600">
                                  {plant}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
