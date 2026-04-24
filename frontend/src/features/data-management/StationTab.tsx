import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
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

interface Station {
  id: number
  name: string
  process_id: number
  description: string | null
  sort_order: number
  is_active: boolean
}

interface Process {
  id: number
  category: string
  name: string
}

interface StationForm {
  name: string
  process_id: number | ''
  description: string
  sort_order: number
  is_active: boolean
}

const EMPTY_FORM: StationForm = { name: '', process_id: '', description: '', sort_order: 0, is_active: true }

export function StationTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Station | null>(null)
  const [form, setForm] = useState<StationForm>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<Station | null>(null)

  const { data: processes } = useQuery({
    queryKey: ['processes'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<Process[]>>('/processes')
      return resp.data.data ?? []
    },
  })

  const processMap = new Map(processes?.map(p => [p.id, p]) ?? [])

  const { data, isLoading } = useQuery({
    queryKey: ['stations', search],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<Station[]>>('/stations', {
        params: { limit: 100 },
      })
      return resp.data.data ?? []
    },
  })

  const createMutation = useMutation({
    mutationFn: (body: StationForm) => apiClient.post('/reference/stations', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stations'] }); closeDialog() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<StationForm> }) =>
      apiClient.put(`/reference/stations/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stations'] }); closeDialog() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/reference/stations/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stations'] }); setDeleteTarget(null) },
  })

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setOpen(true) }
  const openEdit = (s: Station) => {
    setEditing(s)
    setForm({ name: s.name, process_id: s.process_id, description: s.description ?? '', sort_order: s.sort_order, is_active: s.is_active })
    setOpen(true)
  }
  const closeDialog = () => { setOpen(false); setEditing(null); setForm(EMPTY_FORM) }

  const filtered = (data ?? []).filter(
    (s) => {
      if (!search) return true
      const proc = processMap.get(s.process_id)
      return s.name.toLowerCase().includes(search.toLowerCase()) ||
             (proc?.name.toLowerCase().includes(search.toLowerCase()) ?? false)
    }
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search stations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={openCreate}>Add Station</Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Process</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No stations found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => {
                  const proc = processMap.get(s.process_id)
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{proc?.name ?? `Process #${s.process_id}`}</TableCell>
                      <TableCell>
                        {proc && (
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            proc.category === 'Melting' ? 'bg-green-100 text-green-700' :
                            proc.category === 'Finishing' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {proc.category}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{s.sort_order}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 text-xs rounded ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Station' : 'Add Station'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Process</Label>
              <Select
                value={form.process_id ? String(form.process_id) : ''}
                onValueChange={(v) => setForm({ ...form, process_id: v ? Number(v) : '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select process" />
                </SelectTrigger>
                <SelectContent>
                  {processes?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} ({p.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
              onClick={() => editing ? updateMutation.mutate({ id: editing.id, body: form }) : createMutation.mutate(form)}
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
