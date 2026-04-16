import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface Station {
  id: number
  name: string
  process: string
  process_id: number
}

interface StationForm {
  name: string
  process_id: number | ''
}

const EMPTY_FORM: StationForm = { name: '', process_id: '' }

export function StationTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Station | null>(null)
  const [form, setForm] = useState<StationForm>(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['stations', search],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<Station[]>>('/reference/stations', {
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stations'] }),
  })

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setOpen(true) }
  const openEdit = (s: Station) => {
    setEditing(s)
    setForm({ name: s.name, process_id: s.process_id })
    setOpen(true)
  }
  const closeDialog = () => { setOpen(false); setEditing(null); setForm(EMPTY_FORM) }

  const filtered = (data ?? []).filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.process.toLowerCase().includes(search.toLowerCase())
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
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No stations found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.process}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(s.id)}
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
            <DialogTitle>{editing ? 'Edit Station' : 'Add Station'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Process ID</Label>
              <Input
                type="number"
                value={form.process_id}
                onChange={(e) => setForm({ ...form, process_id: e.target.value ? Number(e.target.value) : '' })}
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
