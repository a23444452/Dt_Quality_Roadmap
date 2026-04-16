import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface User {
  id: number
  email: string
  name: string
  role: string
  status: 'pending' | 'active' | 'disabled'
  created_at: string
}

type StatusFilter = 'all' | 'pending' | 'active' | 'disabled'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  disabled: 'bg-gray-100 text-gray-600 border-gray-200',
}

export function UserManagementPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [approvingUser, setApprovingUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('viewer')

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const resp = await apiClient.get<ApiResponse<User[]>>('/users', { params })
      return resp.data.data ?? []
    },
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      apiClient.post(`/users/${id}/approve`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setApprovingUser(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/users/${id}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const disableMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/users/${id}/disable`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/users/${id}/reset-password`),
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
        {(['all', 'pending', 'active', 'disabled'] as StatusFilter[]).map((s) => (
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
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-64">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                (users ?? []).map((u) => (
                  <TableRow
                    key={u.id}
                    className={u.status === 'pending' ? 'bg-yellow-50' : ''}
                  >
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">{u.role}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[u.status]}`}
                      >
                        {u.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="text-xs"
                              onClick={() => { setApprovingUser(u); setSelectedRole('viewer') }}
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
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => disableMutation.mutate(u.id)}
                            disabled={disableMutation.isPending}
                          >
                            Disable
                          </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve User</DialogTitle>
          </DialogHeader>
          {approvingUser && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Approving <strong>{approvingUser.name}</strong> ({approvingUser.email})
              </p>
              <div className="space-y-1">
                <Label>Assign Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setApprovingUser(null)}>Cancel</Button>
                <Button
                  onClick={() => approveMutation.mutate({ id: approvingUser.id, role: selectedRole })}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? 'Approving...' : 'Approve'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
