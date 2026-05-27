import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, FileText, Pencil, Trash2, Upload } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import apiClient from '@/lib/api-client'
import type { GItemEntry } from './types'
import { REASON_LABELS } from './types'
import type { User } from '@/types/auth'

const ALLOWED_FILE_TYPES = '.doc,.docx,.pdf,.xls,.xlsx,.csv,.txt'

interface Props {
  items: GItemEntry[]
  user: User | null
  expandedId: number | null
  onToggleExpand: (id: number) => void
  onEdit: (item: GItemEntry) => void
}

export function GItemsTable({ items, user, expandedId, onToggleExpand, onEdit }: Props) {
  const isAdmin = user?.role === 'admin'
  const canEdit = user?.role === 'admin' || user?.role === 'editor'
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingId, setUploadingId] = useState<number | null>(null)

  const uploadMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiClient.post(`/solutions/${id}/document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['g-items'] })
      setUploadingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/solutions/${id}/document`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['g-items'] }),
  })

  async function handleDownload(solutionId: number, filename: string) {
    try {
      const response = await apiClient.get(`/solutions/${solutionId}/document`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Failed to download document')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && uploadingId) {
      uploadMutation.mutate({ id: uploadingId, file })
    }
    e.target.value = ''
  }

  if (items.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-muted-foreground">
        No G$ items match the current filters.
      </div>
    )
  }

  return (
    <>
      <input
        type="file"
        accept={ALLOWED_FILE_TYPES}
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Solution</TableHead>
            <TableHead>Process</TableHead>
            <TableHead>Station</TableHead>
            <TableHead>Quality Attribute</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Remark</TableHead>
            <TableHead>Document</TableHead>
            {isAdmin && <TableHead className="w-20">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it) => {
            const isOpen = expandedId === it.id
            return (
              <TableRow
                key={it.id}
                className={`hover:bg-gray-50 cursor-pointer ${isOpen ? 'bg-blue-50' : ''}`}
                onClick={() => onToggleExpand(it.id)}
              >
                <TableCell>
                  <span className="p-1 rounded">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                </TableCell>
                <TableCell className="font-medium">{it.name}</TableCell>
                <TableCell>{it.process}</TableCell>
                <TableCell>{it.station}</TableCell>
                <TableCell>{it.quality_attribute ?? '—'}</TableCell>
                <TableCell>
                  {it.reason ? (
                    <Badge variant="outline">{REASON_LABELS[it.reason]}</Badge>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell className="max-w-xs truncate" title={it.remark ?? ''}>
                  {it.remark ?? <span className="text-gray-400">—</span>}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {it.document_filename ? (
                    <div className="flex items-center gap-1">
                      <button
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline max-w-[120px]"
                        onClick={() => handleDownload(it.id, it.document_filename!)}
                        title={it.document_filename}
                      >
                        <FileText size={14} />
                        <span className="truncate">{it.document_filename}</span>
                      </button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(it.id)}
                          disabled={deleteMutation.isPending}
                          title="Delete document"
                        >
                          <Trash2 size={12} />
                        </Button>
                      )}
                    </div>
                  ) : canEdit ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setUploadingId(it.id)
                        fileInputRef.current?.click()
                      }}
                      disabled={uploadMutation.isPending && uploadingId === it.id}
                    >
                      <Upload size={12} className="mr-1" />
                      {uploadMutation.isPending && uploadingId === it.id ? 'Uploading...' : 'Upload'}
                    </Button>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(it)
                      }}
                    >
                      <Pencil size={12} /> Edit
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </>
  )
}
