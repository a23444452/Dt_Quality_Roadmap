import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ExportSection() {
  const [format, setFormat] = useState<'matrix' | 'list'>('matrix')

  const exportMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiClient.get(`/solutions/export?format=${format}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([resp.data as BlobPart]))
      const link = document.createElement('a')
      link.href = url
      link.download = `solutions_${format}_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
  })

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Export Data</h3>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium w-20">Format</label>
        <Select value={format} onValueChange={(v) => setFormat(v as 'matrix' | 'list')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="matrix">Matrix</SelectItem>
            <SelectItem value="list">List</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={() => exportMutation.mutate()}
        disabled={exportMutation.isPending}
      >
        {exportMutation.isPending ? 'Exporting...' : 'Download'}
      </Button>

      {exportMutation.isError && (
        <p className="text-sm text-destructive">Export failed. Please try again.</p>
      )}
    </div>
  )
}
