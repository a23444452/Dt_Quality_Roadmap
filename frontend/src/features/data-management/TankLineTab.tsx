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

interface TankLine {
  id: number
  name: string
  code: string
  line_type: string
  plant_id: number
  sort_order: number
  is_active: boolean
}

interface TankLineForm {
  name: string
  code: string
  line_type: string
  plant_id: number | ''
  is_active: boolean
}

const EMPTY_FORM: TankLineForm = { name: '', code: '', line_type: 'Line', plant_id: '', is_active: true }

interface Plant {
  id: number
  name: string
  code: string
}

export function TankLineTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TankLine | null>(null)
  const [form, setForm] = useState<TankLineForm>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<TankLine | null>(null)

  const { data: plants } = useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<Plant[]>>('/plants')
      return resp.data.data ?? []
    },
  })

  const plantMap = new Map(plants?.map(p => [p.id, p]) ?? [])

  const { data, isLoading } = useQuery({
    queryKey: ['tank-lines', search],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<TankLine[]>>('/tank-lines', {
        params: { limit: 100 },
      })
      return resp.data.data ?? []
    },
  })

  const createMutation = useMutation({
    mutationFn: (body: TankLineForm) => apiClient.post('/tank-lines', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tank-lines'] }); closeDialog() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<TankLineForm> }) =>
      apiClient.put(`/tank-lines/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tank-lines'] }); closeDialog() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/tank-lines/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tank-lines'] }); setDeleteTarget(null) },
  })

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setOpen(true) }
  const openEdit = (t: TankLine) => {
    setEditing(t)
    setForm({ name: t.name, code: t.code, line_type: t.line_type, plant_id: t.plant_id, is_active: t.is_active })
    setOpen(true)
  }
  const closeDialog = () => { setOpen(false); setEditing(null); setForm(EMPTY_FORM) }

  const filtered = (data ?? []).filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search tank lines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={openCreate}>Add Tank Line</Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Plant</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No tank lines found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="font-mono text-sm">{t.code}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 text-xs rounded ${t.line_type === 'Tank' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {t.line_type}
                      </span>
                    </TableCell>
                    <TableCell>{plantMap.get(t.plant_id)?.name ?? `Plant #${t.plant_id}`}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>Edit</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(t)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Tank Line' : 'Add Tank Line'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. T1, L1" />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.line_type} onValueChange={(v) => setForm({ ...form, line_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tank">Tank</SelectItem>
                  <SelectItem value="Line">Line</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Plant</Label>
              <Select
                value={form.plant_id ? String(form.plant_id) : ''}
                onValueChange={(v) => setForm({ ...form, plant_id: v ? Number(v) : '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plant" />
                </SelectTrigger>
                <SelectContent>
                  {plants?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
