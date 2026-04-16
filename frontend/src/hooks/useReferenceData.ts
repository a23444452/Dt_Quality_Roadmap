import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { FilterOptions } from '@/types/reference-data'

export function useReferenceData() {
  return useQuery<FilterOptions>({
    queryKey: ['reference-data'],
    queryFn: async () => {
      const resp = await apiClient.get('/reference-data')
      return resp.data.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
