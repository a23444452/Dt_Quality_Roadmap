import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import type { GItemEntry, GItemFilters, GItemUpdatePayload } from './types'

export function useGItems(filters: GItemFilters) {
  return useQuery({
    queryKey: ['g-items', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      filters.plant_ids?.forEach((id) => params.append('plant_ids', String(id)))
      filters.process_ids?.forEach((id) => params.append('process_ids', String(id)))
      filters.reasons?.forEach((r) => params.append('reasons', r))
      if (filters.search) params.set('search', filters.search)
      params.set('page', String(filters.page ?? 1))
      params.set('limit', String(filters.limit ?? 50))

      const resp = await apiClient.get<ApiResponse<GItemEntry[]>>(
        `/g-items?${params.toString()}`,
      )
      return {
        items: resp.data.data ?? [],
        total: resp.data.meta?.total ?? 0,
        page: resp.data.meta?.page ?? 1,
        limit: resp.data.meta?.limit ?? 50,
      }
    },
  })
}

export function useUpdateGItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      solutionId,
      payload,
    }: {
      solutionId: number
      payload: GItemUpdatePayload
    }) => {
      const resp = await apiClient.put<ApiResponse<GItemEntry>>(
        `/g-items/${solutionId}`,
        payload,
      )
      return resp.data.data!
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['g-items'] })
    },
  })
}
