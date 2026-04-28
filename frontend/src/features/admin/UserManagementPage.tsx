import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface PlantRef {
  id: number
  name: string
}

interface ProcessRef {
  id: number
  name: string
}

interface User {
  id: number
  email: string
  display_name: string
  role: string
  status: 'pending' | 'active' | 'disabled' | 'rejected'
  created_at: string
  plants: PlantRef[]
  processes: ProcessRef[]
}

interface ReferenceOption {
  id: number
  name: string
}

interface ReferenceOptions {
  plants: ReferenceOption[]
  processes: ReferenceOption[]
}

type StatusFilter = 'all' | 'pending' | 'active' | 'disabled' | 'rejected'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  disabled: 'bg-gray-100 text-gray-600 border-gray-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
}

export function UserManagementPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [approvingUser, setApprovingUser] = useState<User | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [disableTarget, setDisableTarget] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('viewer')
  const [selectedPlantIds, setSelectedPlantIds] = useState<number[]>([])
  const [selectedProcessIds, setSelectedProcessIds] = useState<number[]>([])

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const resp = await apiClient.get<ApiResponse<User[]>>('/users', { params })
      return resp.data.data ?? []
    },
  })

  const { data: options } = useQuery({
    queryKey: ['reference-options'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<ReferenceOptions>>('/reference/options')
      return resp.data.data ?? { plants: [], processes: [] }
    },
  })

  useEffect(() => {
    if (approvingUser) {
      setSelectedRole('viewer')
      setSelectedPlantIds(approvingUser.plants?.map((p) => p.id) ?? [])
      setSelectedProcessIds(approvingUser.processes?.map((p) => p.id) ?? [])
    }
  }, [approvingUser])

  useEffect(() => {
    if (editingUser) {
      setSelectedRole(editingUser.role)
      setSelectedPlantIds(editingUser.plants?.map((p) => p.id) ?? [])
      setSelectedProcessIds(editingUser.processes?.map((p) => p.id) ?? [])
    }
  }, [editingUser])

  const approveMutation = useMutation({
    mutationFn: ({ id, role, plant_ids, process_ids }: { id: number; role: string; plant_ids: number[]; process_ids: number[] }) =>
      apiClient.put(`/users/${id}/approve`, { role, plant_ids, process_ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setApprovingUser(null)
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, role, plant_ids, process_ids }: { id: number; role: string; plant_ids: number[]; process_ids: number[] }) =>
      apiClient.put(`/users/${id}`, { role, plant_ids, process_ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setEditingUser(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (id: number) => apiClient.put(`/users/${id}/reject`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const disableMutation = useMutation({
    mutationFn: (id: number) => apiClient.put(`/users/${id}/disable`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['pending-users-count'] })
      setDisableTarget(null)
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (id: number) => apiClient.put(`/users/${id}/reset-password`),
  })

  const pendingCount = (users ?? []).filter((u) => u.status === 'pending').length

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage user accounts and permissions</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300 text-sm px-3 py-1">
            {pendingCount} pending approval
          </Badge>
        )}
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'active', 'disabled', 'rejected'] as StatusFilter[]).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading users...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plants</TableHead>
                <TableHead>Processes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-64">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                (users ?? []).map((u) => (
                  <TableRow
                    key={u.id}
                    className={u.status === 'pending' ? 'bg-yellow-50' : ''}
                  >
                    <TableCell className="font-medium">{u.display_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">{u.role}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.plants?.map((p) => (
                          <Badge key={p.id} variant="outline" className="text-xs">
                            {p.name}
                          </Badge>
                        )) || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.processes?.map((p) => (
                          <Badge key={p.id} variant="secondary" className="text-xs">
                            {p.name}
                          </Badge>
                        )) || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[u.status]}`}
                      >
                        {u.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="text-xs"
                              onClick={() => setApprovingUser(u)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs text-destructive"
                              onClick={() => rejectMutation.mutate(u.id)}
                              disabled={rejectMutation.isPending}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {u.status === 'active' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => setEditingUser(u)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs text-destructive"
                              onClick={() => setDisableTarget(u)}
                            >
                              Disable
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => resetPasswordMutation.mutate(u.id)}
                          disabled={resetPasswordMutation.isPending}
                        >
                          Reset PW
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

      <Dialog open={!!approvingUser} onOpenChange={(o) => !o && setApprovingUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve User</DialogTitle>
          </DialogHeader>
          {approvingUser && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Approving <strong>{approvingUser.display_name}</strong> ({approvingUser.email})
              </p>
              <div className="space-y-1">
                <Label>Assign Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer (read-only)</SelectItem>
                    <SelectItem value="editor">Editor (can edit assigned plants/processes)</SelectItem>
                    <SelectItem value="admin">Admin (full access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Assigned Plants</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-32 overflow-y-auto">
                  {options?.plants.map((plant) => (
                    <label key={plant.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedPlantIds.includes(plant.id)}
                        onCheckedChange={(checked) => {
                          setSelectedPlantIds((prev) =>
                            checked ? [...prev, plant.id] : prev.filter((id) => id !== plant.id)
                          )
                        }}
                      />
                      {plant.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Assigned Processes</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-32 overflow-y-auto">
                  {options?.processes.map((process) => (
                    <label key={process.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedProcessIds.includes(process.id)}
                        onCheckedChange={(checked) => {
                          setSelectedProcessIds((prev) =>
                            checked ? [...prev, process.id] : prev.filter((id) => id !== process.id)
                          )
                        }}
                      />
                      {process.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setApprovingUser(null)}>Cancel</Button>
                <Button
                  onClick={() => approveMutation.mutate({
                    id: approvingUser.id,
                    role: selectedRole,
                    plant_ids: selectedPlantIds,
                    process_ids: selectedProcessIds,
                  })}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? 'Approving...' : 'Approve'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Editing <strong>{editingUser.display_name}</strong> ({editingUser.email})
              </p>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer (read-only)</SelectItem>
                    <SelectItem value="editor">Editor (can edit assigned plants/processes)</SelectItem>
                    <SelectItem value="admin">Admin (full access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Assigned Plants</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-32 overflow-y-auto">
                  {options?.plants.map((plant) => (
                    <label key={plant.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedPlantIds.includes(plant.id)}
                        onCheckedChange={(checked) => {
                          setSelectedPlantIds((prev) =>
                            checked ? [...prev, plant.id] : prev.filter((id) => id !== plant.id)
                          )
                        }}
                      />
                      {plant.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Assigned Processes</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-32 overflow-y-auto">
                  {options?.processes.map((process) => (
                    <label key={process.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedProcessIds.includes(process.id)}
                        onCheckedChange={(checked) => {
                          setSelectedProcessIds((prev) =>
                            checked ? [...prev, process.id] : prev.filter((id) => id !== process.id)
                          )
                        }}
                      />
                      {process.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                <Button
                  onClick={() => editMutation.mutate({
                    id: editingUser.id,
                    role: selectedRole,
                    plant_ids: selectedPlantIds,
                    process_ids: selectedProcessIds,
                  })}
                  disabled={editMutation.isPending}
                >
                  {editMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!disableTarget} onOpenChange={(open) => !open && setDisableTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認停用帳號</AlertDialogTitle>
            <AlertDialogDescription>
              確定要停用 <strong>{disableTarget?.display_name}</strong> 的帳號嗎？停用後該使用者將無法登入系統。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disableTarget && disableMutation.mutate(disableTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disableMutation.isPending ? '停用中...' : '確定停用'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
