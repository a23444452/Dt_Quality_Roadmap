import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Download, ChevronDown } from 'lucide-react'
import apiClient from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Format = 'matrix' | 'list'

interface Props {
  processId?: number
  plantId?: number
}

export function ExportButton({ processId, plantId }: Props) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const exportMutation = useMutation({
    mutationFn: async (format: Format) => {
      const params = new URLSearchParams({ format })
      if (processId !== undefined) params.set('process_id', String(processId))
      if (plantId !== undefined) params.set('plant_id', String(plantId))

      const resp = await apiClient.get(`/import-export/export?${params.toString()}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([resp.data as BlobPart]))
      const link = document.createElement('a')
      link.href = url
      link.download = `solution_map_export_${format}_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      return format
    },
    onSuccess: () => setErrorMsg(null),
    onError: () => setErrorMsg('Export failed. Please try again.'),
  })

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            disabled={exportMutation.isPending}
            className="gap-1.5"
          >
            <Download size={14} />
            {exportMutation.isPending ? 'Exporting...' : 'Export'}
            <ChevronDown size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => exportMutation.mutate('matrix')}>
            Matrix format (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportMutation.mutate('list')}>
            List format (.xlsx)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {errorMsg && <span className="text-xs text-destructive">{errorMsg}</span>}
    </div>
  )
}
