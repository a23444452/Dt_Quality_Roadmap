import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { PivotData } from '@/types/solution-map'

export function useSolutionMap(filters: Record<string, string | number | undefined>) {
  return useQuery<PivotData>({
    queryKey: ['solution-map', filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined)
      )
      const resp = await apiClient.get('/solution-map', { params })
      return resp.data.data
    },
  })
}

export function useUpdateSolutionMap() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      mapId,
      data,
    }: {
      mapId: number
      data: { status_id: number; notes?: string; version: number }
    }) => {
      const resp = await apiClient.put(`/solution-map/${mapId}`, data)
      return resp.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['solution-map'] }),
  })
}

export function useCreateSolutionMap() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      solution_id: number
      tank_line_id: number
      status_id: number
      notes?: string
    }) => {
      const resp = await apiClient.post('/solution-map/batch', {
        updates: [data],
      })
      return resp.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['solution-map'] }),
  })
}
