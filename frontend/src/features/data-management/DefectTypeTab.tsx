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

interface DefectType {
  id: number
  category_id: number
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
}

interface DefectCategory {
  id: number
  name: string
}

interface DefectTypeForm {
  category_id: number | ''
  name: string
  description: string
  sort_order: number
  is_active: boolean
}

const EMPTY_FORM: DefectTypeForm = { category_id: '', name: '', description: '', sort_order: 0, is_active: true }

export function DefectTypeTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DefectType | null>(null)
  const [form, setForm] = useState<DefectTypeForm>(EMPTY_FORM)

  const { data: categories } = useQuery({
    queryKey: ['defect-categories'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<DefectCategory[]>>('/defect-categories')
      return resp.data.data ?? []
    },
  })

  const categoryMap = new Map(categories?.map(c => [c.id, c]) ?? [])

  const { data, isLoading } = useQuery({
    queryKey: ['defect-types', search],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<DefectType[]>>('/defect-types', {
        params: { limit: 100 },
      })
      return resp.data.data ?? []
    },
  })

  const createMutation = useMutation({
    mutationFn: (body: DefectTypeForm) => apiClient.post('/defect-types', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['defect-types'] }); closeDialog() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<DefectTypeForm> }) =>
      apiClient.put(`/defect-types/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['defect-types'] }); closeDialog() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/defect-types/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['defect-types'] }),
  })

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setOpen(true) }
  const openEdit = (d: DefectType) => {
    setEditing(d)
    setForm({ category_id: d.category_id, name: d.name, description: d.description ?? '', sort_order: d.sort_order, is_active: d.is_active })
    setOpen(true)
  }
  const closeDialog = () => { setOpen(false); setEditing(null); setForm(EMPTY_FORM) }

  const filtered = (data ?? []).filter(
    (d) => {
      if (!search) return true
      const cat = categoryMap.get(d.category_id)
      return d.name.toLowerCase().includes(search.toLowerCase()) ||
             (cat?.name.toLowerCase().includes(search.toLowerCase()) ?? false)
    }
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
                <TableHead>Sort Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No defect types found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => {
                  const cat = categoryMap.get(d.category_id)
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{cat?.name ?? `Category #${d.category_id}`}</TableCell>
                      <TableCell className="text-muted-foreground">{d.description ?? '—'}</TableCell>
                      <TableCell>{d.sort_order}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 text-xs rounded ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {d.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
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
            <DialogTitle>{editing ? 'Edit Defect Type' : 'Add Defect Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select
                value={form.category_id ? String(form.category_id) : ''}
                onValueChange={(v) => setForm({ ...form, category_id: v ? Number(v) : '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
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
    </div>
  )
}
