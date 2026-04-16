import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface TankLine {
  id: number
  name: string
  key: string
  plant: string
  plant_id: number
}

interface TankLineForm {
  name: string
  key: string
  plant_id: number | ''
}

const EMPTY_FORM: TankLineForm = { name: '', key: '', plant_id: '' }

export function TankLineTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TankLine | null>(null)
  const [form, setForm] = useState<TankLineForm>(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['tank-lines', search],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<TankLine[]>>('/reference/tank-lines', {
        params: { limit: 100 },
      })
      return resp.data.data ?? []
    },
  })

  const createMutation = useMutation({
    mutationFn: (body: TankLineForm) => apiClient.post('/reference/tank-lines', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tank-lines'] }); closeDialog() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<TankLineForm> }) =>
      apiClient.put(`/reference/tank-lines/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tank-lines'] }); closeDialog() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/reference/tank-lines/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tank-lines'] }),
  })

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setOpen(true) }
  const openEdit = (t: TankLine) => {
    setEditing(t)
    setForm({ name: t.name, key: t.key, plant_id: t.plant_id })
    setOpen(true)
  }
  const closeDialog = () => { setOpen(false); setEditing(null); setForm(EMPTY_FORM) }

  const filtered = (data ?? []).filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.plant.toLowerCase().includes(search.toLowerCase())
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
                <TableHead>Key</TableHead>
                <TableHead>Plant</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No tank lines found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="font-mono text-sm">{t.key}</TableCell>
                    <TableCell>{t.plant}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>Edit</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(t.id)}
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
              <Label>Key</Label>
              <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="e.g. LINE_A1" />
            </div>
            <div className="space-y-1">
              <Label>Plant ID</Label>
              <Input
                type="number"
                value={form.plant_id}
                onChange={(e) => setForm({ ...form, plant_id: e.target.value ? Number(e.target.value) : '' })}
              />
            </div>
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
    </div>
  )
}
