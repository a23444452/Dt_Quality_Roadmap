import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { SolutionMapPage } from '@/features/solution-map/SolutionMapPage'
import { ProcessMapPage } from '@/features/process-map/ProcessMapPage'
import { DataManagementPage } from '@/features/data-management/DataManagementPage'
import { DefectAnalysisPage } from '@/features/analysis/DefectAnalysisPage'
import { ProcessAnalysisPage } from '@/features/analysis/ProcessAnalysisPage'
import { UserManagementPage } from '@/features/admin/UserManagementPage'
import { AdminSettingsPage } from '@/features/admin/AdminSettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="solution-map" element={<SolutionMapPage />} />
        <Route path="process-map" element={<ProcessMapPage />} />
        <Route path="data-management" element={<DataManagementPage />} />
        <Route path="analysis/defect" element={<DefectAnalysisPage />} />
        <Route path="analysis/process" element={<ProcessAnalysisPage />} />
        <Route path="admin/users" element={<UserManagementPage />} />
        <Route path="admin/settings" element={<AdminSettingsPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
