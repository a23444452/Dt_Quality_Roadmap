import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ImportError {
  row: number
  field: string
  message: string
}

interface ImportPreview {
  import_id: string
  total_rows: number
  new_records: number
  updated_records: number
  errors: ImportError[]
  warnings: string[]
}

export function ImportSection() {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<'matrix' | 'list'>('matrix')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const previewMutation = useMutation({
    mutationFn: async (f: File) => {
      const form = new FormData()
      form.append('file', f)
      form.append('format', format)
      const resp = await apiClient.post<{ data: ImportPreview }>('/import-export/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return resp.data.data
    },
    onSuccess: (data) => {
      setPreview(data)
    },
  })

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!preview?.import_id) return
      const resp = await apiClient.post('/import-export/import/confirm', { import_id: preview.import_id })
      return resp.data
    },
    onSuccess: () => {
      setFile(null)
      setPreview(null)
    },
  })

  const handleFileChange = (f: File) => {
    setFile(f)
    setPreview(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileChange(dropped)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Import Data</h3>

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

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f) }}
        />
        {file ? (
          <div className="text-sm">
            <p className="font-medium text-gray-900">{file.name}</p>
            <p className="text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            <p className="font-medium">Drop file here or click to browse</p>
            <p>Supports .xlsx and .csv</p>
          </div>
        )}
      </div>

      {file && !preview && (
        <Button
          onClick={() => previewMutation.mutate(file)}
          disabled={previewMutation.isPending}
        >
          {previewMutation.isPending ? 'Analyzing...' : 'Preview'}
        </Button>
      )}

      {preview && (
        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="font-medium">Import Preview</h4>
          <p className="text-sm text-muted-foreground">Total rows: {preview.total_rows}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-50 rounded">
              <p className="text-2xl font-bold text-green-700">{preview.new_records}</p>
              <p className="text-xs text-green-600">New</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded">
              <p className="text-2xl font-bold text-blue-700">{preview.updated_records}</p>
              <p className="text-xs text-blue-600">Updated</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <p className="text-2xl font-bold text-red-700">{preview.errors.length}</p>
              <p className="text-xs text-red-600">Errors</p>
            </div>
          </div>
          {preview.errors.length > 0 && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded space-y-1">
              {preview.errors.slice(0, 5).map((err, i) => (
                <p key={i}>Row {err.row}: {err.message}</p>
              ))}
              {preview.errors.length > 5 && <p>...and {preview.errors.length - 5} more errors</p>}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending || preview.errors.length > 0}
            >
              {confirmMutation.isPending ? 'Importing...' : 'Confirm Import'}
            </Button>
            <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
