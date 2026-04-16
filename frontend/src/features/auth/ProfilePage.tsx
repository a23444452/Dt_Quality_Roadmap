import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import apiClient from '@/lib/api-client'
import { User, Shield, Mail, KeyRound } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
}

export function ProfilePage() {
  const { user } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPasswordError('Password must contain uppercase, lowercase, and a digit.')
      return
    }

    setIsSubmitting(true)
    try {
      // Re-login with current password to verify, then reset
      await apiClient.post('/auth/login', {
        username: user?.username,
        password: currentPassword,
      })
      // Use forgot-password + reset flow or a dedicated change-password endpoint
      // For now, we'll use the admin reset-password if user is admin,
      // or show a message to use forgot-password flow
      setPasswordSuccess('Password verification successful. Use "Forgot Password" on the login page to set a new password, or ask an admin to reset it.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setPasswordError('Current password is incorrect.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">View your account information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User size={18} />
            Account Information
          </CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Username</Label>
              <p className="text-sm font-medium mt-1">{user.username}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Display Name</Label>
              <p className="text-sm font-medium mt-1">{user.display_name}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-muted-foreground" />
              <div>
                <Label className="text-xs text-muted-foreground">Role</Label>
                <p className="text-sm font-medium mt-1">{ROLE_LABELS[user.role] ?? user.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-muted-foreground" />
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <p className="text-sm font-medium mt-1 capitalize">Active</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound size={18} />
            Change Password
          </CardTitle>
          <CardDescription>Update your password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="At least 8 characters, uppercase, lowercase, digit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {passwordError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{passwordError}</div>
            )}
            {passwordSuccess && (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">{passwordSuccess}</div>
            )}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Verifying...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
