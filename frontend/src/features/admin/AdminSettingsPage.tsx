import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import type { Status } from '@/types/reference-data'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface StatusForm {
  name: string
  code: string
  color: string
}

export function AdminSettingsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const isAdmin = user?.role === 'admin'

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Status | null>(null)
  const [form, setForm] = useState<StatusForm>({ name: '', code: '', color: '#888888' })

  const { data: statuses, isLoading } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<Status[]>>('/statuses')
      return resp.data.data ?? []
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<StatusForm> }) =>
      apiClient.put(`/statuses/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['statuses'] })
      setOpen(false)
      setEditing(null)
    },
  })

  const createMutation = useMutation({
    mutationFn: (body: StatusForm) => apiClient.post('/statuses', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['statuses'] })
      setOpen(false)
    },
  })

  const openEdit = (s: Status) => {
    setEditing(s)
    setForm({ name: s.name, code: s.code, color: s.color })
    setOpen(true)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', code: '', color: '#888888' })
    setOpen(true)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage status definitions and system configuration</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>Add Status</Button>
        )}
      </div>

      <div className="rounded-lg border bg-white">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">Status Definitions</h2>
          <p className="text-sm text-muted-foreground">Solution map status codes and their colors</p>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Color</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                {isAdmin && <TableHead className="w-20">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(statuses ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-8">
                    No statuses defined.
                  </TableCell>
                </TableRow>
              ) : (
                (statuses ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: s.color }}
                        title={s.color}
                      />
                    </TableCell>
                    <TableCell>
                      <code className="text-sm font-mono bg-gray-100 px-1.5 py-0.5 rounded">{s.code}</code>
                    </TableCell>
                    <TableCell>{s.name}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Status' : 'Add Status'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. IN_PROGRESS"
                disabled={!!editing}
              />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. In Progress"
              />
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-10 h-9 rounded border cursor-pointer"
                />
                <Input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  placeholder="#rrggbb"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (editing) {
                  updateMutation.mutate({ id: editing.id, body: { name: form.name, color: form.color } })
                } else {
                  createMutation.mutate(form)
                }
              }}
              disabled={updateMutation.isPending || createMutation.isPending}
            >
              {editing ? 'Save' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
