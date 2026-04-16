import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface DefectType {
  id: number
  name: string
  category: string
  description?: string
}

interface DefectTypeForm {
  name: string
  category: string
  description: string
}

const EMPTY_FORM: DefectTypeForm = { name: '', category: '', description: '' }

export function DefectTypeTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DefectType | null>(null)
  const [form, setForm] = useState<DefectTypeForm>(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['defect-types', search],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<DefectType[]>>('/reference/defect-types', {
        params: { search: search || undefined, limit: 100 },
      })
      return resp.data.data ?? []
    },
  })

  const createMutation = useMutation({
    mutationFn: (body: DefectTypeForm) => apiClient.post('/reference/defect-types', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['defect-types'] }); closeDialog() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<DefectTypeForm> }) =>
      apiClient.put(`/reference/defect-types/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['defect-types'] }); closeDialog() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/reference/defect-types/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['defect-types'] }),
  })

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setOpen(true) }
  const openEdit = (d: DefectType) => {
    setEditing(d)
    setForm({ name: d.name, category: d.category, description: d.description ?? '' })
    setOpen(true)
  }
  const closeDialog = () => { setOpen(false); setEditing(null); setForm(EMPTY_FORM) }

  const filtered = (data ?? []).filter(
    (d) =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search defect types..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={openCreate}>Add Defect Type</Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No defect types found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.category}</TableCell>
                    <TableCell className="text-muted-foreground">{d.description ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>Edit</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(d.id)}
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
            <DialogTitle>{editing ? 'Edit Defect Type' : 'Add Defect Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
