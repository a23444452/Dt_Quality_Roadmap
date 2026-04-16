import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface Solution {
  id: number
  name: string
  defect_type: string
  defect_category: string
  station: string
  process: string
}

interface SolutionForm {
  name: string
  defect_type_id: number | ''
  station_id: number | ''
}

const EMPTY_FORM: SolutionForm = { name: '', defect_type_id: '', station_id: '' }

export function SolutionTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Solution | null>(null)
  const [form, setForm] = useState<SolutionForm>(EMPTY_FORM)

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solutions'] }),
  })

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setOpen(true) }
  const openEdit = (s: Solution) => {
    setEditing(s)
    setForm({ name: s.name, defect_type_id: '', station_id: '' })
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
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.defect_type.toLowerCase().includes(search.toLowerCase())
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
        <Button onClick={openCreate}>Add Solution</Button>
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
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No solutions found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.defect_type}</TableCell>
                    <TableCell>{s.defect_category}</TableCell>
                    <TableCell>{s.station}</TableCell>
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
    </div>
  )
}
