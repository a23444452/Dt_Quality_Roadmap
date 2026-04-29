import { useState, useMemo, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Upload, Trash2, Download } from 'lucide-react'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const ALLOWED_FILE_TYPES = '.doc,.docx,.pdf,.xls,.xlsx,.csv,.txt'

interface Solution {
  id: number
  name: string
  defect_type_id: number
  station_id: number
  quality_attribute: string | null
  description: string | null
  document_filename: string | null
  document_path: string | null
  sort_order: number
  is_g_item: boolean
  is_active: boolean
}

interface DefectType {
  id: number
  category_id: number
  name: string
}

interface DefectCategory {
  id: number
  name: string
}

interface Station {
  id: number
  process_id: number
  name: string
}

interface Process {
  id: number
  category: string
  name: string
}

interface SolutionForm {
  name: string
  defect_type_id: number | ''
  station_id: number | ''
  quality_attribute: string
  description: string
  sort_order: number
  is_g_item: boolean
  is_active: boolean
}

const EMPTY_FORM: SolutionForm = { name: '', defect_type_id: '', station_id: '', quality_attribute: '', description: '', sort_order: 0, is_g_item: false, is_active: true }

function getFileIcon(filename: string | null) {
  if (!filename) return null
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext
}

export function SolutionTab() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Solution | null>(null)
  const [form, setForm] = useState<SolutionForm>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<Solution | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingSolutionId, setUploadingSolutionId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialogFileInputRef = useRef<HTMLInputElement>(null)

  const userProcessIds = useMemo(() => new Set(user?.processes?.map(p => p.id) ?? []), [user])
  const isAdmin = user?.role === 'admin'
  const isEditor = user?.role === 'editor'

  const { data: defectCategories } = useQuery({
    queryKey: ['defect-categories'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<DefectCategory[]>>('/defect-categories')
      return resp.data.data ?? []
    },
  })

  const { data: defectTypes } = useQuery({
    queryKey: ['defect-types'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<DefectType[]>>('/defect-types')
      return resp.data.data ?? []
    },
  })

  const { data: processes } = useQuery({
    queryKey: ['processes'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<Process[]>>('/processes')
      return resp.data.data ?? []
    },
  })

  const { data: stations } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<Station[]>>('/stations')
      return resp.data.data ?? []
    },
  })

  const defectTypeMap = new Map(defectTypes?.map(dt => [dt.id, dt]) ?? [])
  const defectCategoryMap = new Map(defectCategories?.map(c => [c.id, c]) ?? [])
  const stationMap = new Map(stations?.map(s => [s.id, s]) ?? [])
  const processMap = new Map(processes?.map(p => [p.id, p]) ?? [])

  const canAdd = isAdmin || (isEditor && userProcessIds.size > 0)
  const canEditSolution = useCallback((solution: Solution) => {
    if (isAdmin) return true
    if (!isEditor) return false
    const station = stationMap.get(solution.station_id)
    return station ? userProcessIds.has(station.process_id) : false
  }, [isAdmin, isEditor, stationMap, userProcessIds])

  // Filter stations based on user's process permissions (for Add/Edit dropdown)
  const allowedStations = useMemo(() => {
    if (!stations) return []
    if (isAdmin) return stations
    return stations.filter(s => userProcessIds.has(s.process_id))
  }, [stations, isAdmin, userProcessIds])

  const { data, isLoading } = useQuery({
    queryKey: ['solutions', search],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<Solution[]>>('/solutions', {
        params: { search: search || undefined, limit: 100 },
      })
      return resp.data.data ?? []
    },
  })

  const createMutation = useMutation({
    mutationFn: (body: SolutionForm) => apiClient.post('/solutions', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['solutions'] }); closeDialog() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<SolutionForm> }) =>
      apiClient.put(`/solutions/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['solutions'] }); closeDialog() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/solutions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['solutions'] }); setDeleteTarget(null) },
  })

  const toggleGItemMutation = useMutation({
    mutationFn: ({ id, is_g_item }: { id: number; is_g_item: boolean }) =>
      apiClient.put(`/solutions/${id}`, { is_g_item }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solutions'] }),
  })

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiClient.post(`/solutions/${id}/document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solutions'] })
      setUploadingSolutionId(null)
      setSelectedFile(null)
    },
  })

  const deleteDocumentMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/solutions/${id}/document`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solutions'] }),
  })

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setSelectedFile(null); setOpen(true) }
  const openEdit = (s: Solution) => {
    setEditing(s)
    setForm({
      name: s.name,
      defect_type_id: s.defect_type_id,
      station_id: s.station_id,
      quality_attribute: s.quality_attribute ?? '',
      description: s.description ?? '',
      sort_order: s.sort_order,
      is_g_item: s.is_g_item,
      is_active: s.is_active
    })
    setSelectedFile(null)
    setOpen(true)
  }
  const closeDialog = () => { setOpen(false); setEditing(null); setForm(EMPTY_FORM); setSelectedFile(null) }

  const handleDownloadDocument = async (solutionId: number, filename: string) => {
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, solutionId?: number) => {
    const file = e.target.files?.[0]
    if (file) {
      if (solutionId) {
        // Direct upload from table
        uploadDocumentMutation.mutate({ id: solutionId, file })
      } else {
        // File selected in dialog (for new solution or editing)
        setSelectedFile(file)
      }
    }
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, body: form }, {
        onSuccess: () => {
          if (selectedFile) {
            uploadDocumentMutation.mutate({ id: editing.id, file: selectedFile })
          }
        }
      })
    } else {
      createMutation.mutate(form, {
        onSuccess: (response) => {
          if (selectedFile && response.data?.data?.id) {
            uploadDocumentMutation.mutate({ id: response.data.data.id, file: selectedFile })
          }
        }
      })
    }
  }

  const filtered = (data ?? []).filter(
    (s) => {
      if (!search) return true
      const dt = defectTypeMap.get(s.defect_type_id)
      const sta = stationMap.get(s.station_id)
      return s.name.toLowerCase().includes(search.toLowerCase()) ||
             (dt?.name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
             (sta?.name.toLowerCase().includes(search.toLowerCase()) ?? false)
    }
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search solutions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {canAdd && <Button onClick={openCreate}>Add Solution</Button>}
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">G$ Item</TableHead>
                <TableHead>Solution Name</TableHead>
                <TableHead>Process</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Quality Attribute</TableHead>
                <TableHead>Defect Category</TableHead>
                <TableHead>Defect Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Document</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No solutions found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => {
                  const dt = defectTypeMap.get(s.defect_type_id)
                  const cat = dt ? defectCategoryMap.get(dt.category_id) : null
                  const sta = stationMap.get(s.station_id)
                  const proc = sta ? processMap.get(sta.process_id) : null
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Checkbox
                          checked={s.is_g_item}
                          disabled={!isAdmin}
                          onCheckedChange={(checked) => {
                            if (isAdmin) {
                              toggleGItemMutation.mutate({ id: s.id, is_g_item: !!checked })
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{proc?.name ?? '—'}</TableCell>
                      <TableCell>{sta?.name ?? `Station #${s.station_id}`}</TableCell>
                      <TableCell>{s.quality_attribute ?? '—'}</TableCell>
                      <TableCell>{cat?.name ?? '—'}</TableCell>
                      <TableCell>{dt?.name ?? `Type #${s.defect_type_id}`}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 text-xs rounded ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {s.document_filename ? (
                          <div className="flex items-center gap-1">
                            <button
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline max-w-[120px]"
                              onClick={() => handleDownloadDocument(s.id, s.document_filename!)}
                              title={s.document_filename}
                            >
                              <FileText size={14} />
                              <span className="truncate">{s.document_filename}</span>
                            </button>
                            {canEditSolution(s) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={() => deleteDocumentMutation.mutate(s.id)}
                                disabled={deleteDocumentMutation.isPending}
                                title="Delete document"
                              >
                                <Trash2 size={12} />
                              </Button>
                            )}
                          </div>
                        ) : canEditSolution(s) ? (
                          <div>
                            <input
                              type="file"
                              accept={ALLOWED_FILE_TYPES}
                              className="hidden"
                              ref={fileInputRef}
                              onChange={(e) => handleFileSelect(e, s.id)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setUploadingSolutionId(s.id)
                                fileInputRef.current?.click()
                              }}
                              disabled={uploadDocumentMutation.isPending && uploadingSolutionId === s.id}
                            >
                              <Upload size={12} className="mr-1" />
                              {uploadDocumentMutation.isPending && uploadingSolutionId === s.id ? 'Uploading...' : 'Upload'}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {canEditSolution(s) && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(s)}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Solution' : 'Add Solution'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Solution name"
              />
            </div>
            <div className="space-y-1">
              <Label>Defect Type</Label>
              <Select
                value={form.defect_type_id ? String(form.defect_type_id) : ''}
                onValueChange={(v) => setForm({ ...form, defect_type_id: v ? Number(v) : '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select defect type" />
                </SelectTrigger>
                <SelectContent>
                  {defectTypes?.map((dt) => {
                    const cat = defectCategoryMap.get(dt.category_id)
                    return (
                      <SelectItem key={dt.id} value={String(dt.id)}>
                        {dt.name} ({cat?.name ?? 'Unknown'})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Station</Label>
              <Select
                value={form.station_id ? String(form.station_id) : ''}
                onValueChange={(v) => setForm({ ...form, station_id: v ? Number(v) : '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  {allowedStations.map((s) => {
                    const proc = processMap.get(s.process_id)
                    return (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} ({proc?.name ?? 'Unknown'})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Quality Attribute</Label>
              <Input
                value={form.quality_attribute}
                onChange={(e) => setForm({ ...form, quality_attribute: e.target.value })}
                placeholder="e.g. Dimensional, Visual"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            {isAdmin && (
              <div className="flex items-center justify-between">
                <Label>G$ Item</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={form.is_g_item}
                    onCheckedChange={(checked) => setForm({ ...form, is_g_item: !!checked })}
                  />
                  <span className={`text-sm ${form.is_g_item ? 'text-blue-600' : 'text-gray-500'}`}>
                    {form.is_g_item ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            )}
            {editing && (
              <div className="flex items-center justify-between">
                <Label>Status</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                  />
                  <span className={`text-sm ${form.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                    {form.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label>Document</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept={ALLOWED_FILE_TYPES}
                  className="hidden"
                  ref={dialogFileInputRef}
                  onChange={(e) => handleFileSelect(e)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => dialogFileInputRef.current?.click()}
                >
                  <Upload size={14} className="mr-1" />
                  Choose File
                </Button>
                {selectedFile ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <FileText size={14} />
                    <span className="truncate max-w-[150px]">{selectedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => setSelectedFile(null)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                ) : editing?.document_filename ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText size={14} />
                    <span className="truncate max-w-[150px]">{editing.document_filename}</span>
                    <span className="text-xs">(current)</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No file selected</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Allowed: Word, PDF, Excel, CSV, TXT
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? 'Save' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
