import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'

interface Solution {
  id: number
  name: string
  quality_attribute: string | null
  defect_type: string
  defect_category: string
  station: string
  process: string
}

interface SolutionMapData {
  solutions: Solution[]
  lines: unknown[]
  filters: {
    processes: Array<{ id: number; name: string; category: string }>
  }
}

export function useProcessSolutions(processName: string | null) {
  return useQuery({
    queryKey: ['process-solutions', processName],
    queryFn: async () => {
      if (!processName) return []

      // 先取得 process_id
      const refResp = await apiClient.get<ApiResponse<SolutionMapData>>('/solution-map')
      const processes = refResp.data.data?.filters?.processes ?? []
      const process = processes.find((p) => p.name === processName)

      if (!process) return []

      // 用 process_id 查詢 solutions
      const resp = await apiClient.get<ApiResponse<SolutionMapData>>(
        `/solution-map?process_id=${process.id}`
      )
      return resp.data.data?.solutions ?? []
    },
    enabled: processName !== null,
    staleTime: 60 * 1000,
  })
}
