import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ExportSection() {
  const [format, setFormat] = useState<'matrix' | 'list'>('matrix')

  const exportMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiClient.get(`/import-export/export?format=${format}`, {
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
    },
  })

  const templateMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiClient.get(`/import-export/template?format=${format}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([resp.data as BlobPart]))
      const link = document.createElement('a')
      link.href = url
      link.download = `import_template_${format}.xlsx`
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

      <div className="flex gap-2">
        <Button
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? 'Exporting...' : 'Download Export'}
        </Button>
        <Button
          variant="outline"
          onClick={() => templateMutation.mutate()}
          disabled={templateMutation.isPending}
        >
          {templateMutation.isPending ? 'Downloading...' : 'Download Template'}
        </Button>
      </div>

      {exportMutation.isError && (
        <p className="text-sm text-destructive">Export failed. Please try again.</p>
      )}
      {templateMutation.isError && (
        <p className="text-sm text-destructive">Template download failed. Please try again.</p>
      )}
    </div>
  )
}
