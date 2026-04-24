import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

interface Solution {
  id: number
  name: string
  defect_type_id: number
  station_id: number
  quality_attribute: string | null
  description: string | null
  sort_order: number
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
  is_active: boolean
}

const EMPTY_FORM: SolutionForm = { name: '', defect_type_id: '', station_id: '', quality_attribute: '', description: '', sort_order: 0, is_active: true }

export function SolutionTab() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Solution | null>(null)
  const [form, setForm] = useState<SolutionForm>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<Solution | null>(null)

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

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setOpen(true) }
  const openEdit = (s: Solution) => {
    setEditing(s)
    setForm({
      name: s.name,
      defect_type_id: s.defect_type_id,
      station_id: s.station_id,
      quality_attribute: s.quality_attribute ?? '',
      description: s.description ?? '',
      sort_order: s.sort_order,
      is_active: s.is_active
    })
    setOpen(true)
  }
  const closeDialog = () => { setOpen(false); setEditing(null); setForm(EMPTY_FORM) }

  const handleSubmit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, body: form })
    } else {
      createMutation.mutate(form)
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
                <TableHead>Name</TableHead>
                <TableHead>Defect Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Process</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{dt?.name ?? `Type #${s.defect_type_id}`}</TableCell>
                      <TableCell>{cat?.name ?? '—'}</TableCell>
                      <TableCell>{sta?.name ?? `Station #${s.station_id}`}</TableCell>
                      <TableCell>{proc?.name ?? '—'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 text-xs rounded ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
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
