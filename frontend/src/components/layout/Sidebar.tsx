import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Grid3X3,
  GitBranch,
  Database,
  Activity,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Mail,
  DollarSign,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/features/auth/AuthContext'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'

interface NavItem {
  label: string
  icon: React.ElementType
  to: string
  badge?: number
}

const mainNavItems: NavItem[] = [
  { label: 'Process Map', icon: GitBranch, to: '/' },
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Solution Map', icon: Grid3X3, to: '/solution-map' },
  { label: 'Process Analysis', icon: Activity, to: '/analysis/process' },
  { label: 'Data Management', icon: Database, to: '/data-management' },
]

const managementNavItems: NavItem[] = [
  { label: 'G$ Management', icon: DollarSign, to: '/admin/g-items' },
]

interface SidebarNavItemProps {
  item: NavItem
  collapsed: boolean
  isExact?: boolean
}

function SidebarNavItem({ item, collapsed, isExact = false }: SidebarNavItemProps) {
  const location = useLocation()
  const Icon = item.icon

  const isActive = isExact
    ? location.pathname === item.to
    : location.pathname === item.to || location.pathname.startsWith(item.to + '/')

  const linkClasses = [
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    'hover:bg-blue-800 hover:text-white',
    isActive ? 'bg-blue-700 text-white' : 'text-blue-100',
    collapsed ? 'justify-center px-2' : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <NavLink to={item.to} className={`${linkClasses} relative`}>
            <Icon size={20} className="shrink-0" />
            {item.badge !== undefined && item.badge > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{item.label}{item.badge ? ` (${item.badge})` : ''}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <NavLink to={item.to} className={linkClasses}>
      <Icon size={20} className="shrink-0" />
      <span className="truncate">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1.5">
          {item.badge}
        </Badge>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuth()

  const isAdmin = user?.role === 'admin'
  const isAdminOrEditor = user?.role === 'admin' || user?.role === 'editor'

  // Fetch pending users count for admin badge
  const { data: pendingCount } = useQuery({
    queryKey: ['pending-users-count'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<{ count: number }>>('/users/pending-count')
      return resp.data.data?.count ?? 0
    },
    enabled: isAdmin,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  })

  // Fetch system config for admin contact emails
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<{ admin_emails: string[]; app_url: string }>>('/reference/system-config')
      return resp.data.data ?? { admin_emails: [], app_url: '' }
    },
    staleTime: 300000, // Cache for 5 minutes
  })

  // Build admin nav items with pending count badge
  const adminNavItemsWithBadge: NavItem[] = [
    { label: 'User Management', icon: Users, to: '/admin/users', badge: pendingCount },
    { label: 'Settings', icon: Settings, to: '/admin/settings' },
  ]

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={[
          'flex flex-col bg-blue-900 text-white transition-all duration-300',
          collapsed ? 'w-16' : 'w-56',
        ].join(' ')}
      >
        {/* Logo area */}
        <div className="flex h-36 items-center justify-center border-b border-blue-800 px-2">
          {collapsed ? (
            <img src="/logo.png" alt="D^t Solution Roadmap" className="h-28 w-28 object-contain" />
          ) : (
            <img src="/logo.png" alt="D^t Solution Roadmap" className="h-32 object-contain" />
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {mainNavItems.map((item) => (
            <SidebarNavItem
              key={item.to}
              item={item}
              collapsed={collapsed}
              isExact={item.to === '/'}
            />
          ))}

          {isAdminOrEditor &&
            managementNavItems.map((item) => (
              <SidebarNavItem key={item.to} item={item} collapsed={collapsed} />
            ))}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className="py-2">
                <Separator className="bg-blue-800" />
              </div>
              {!collapsed && (
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-blue-400">
                  Admin
                </p>
              )}
              {adminNavItemsWithBadge.map((item) => (
                <SidebarNavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </>
          )}
        </nav>

        {/* Admin Contact */}
        {systemConfig?.admin_emails && systemConfig.admin_emails.length > 0 && (
          <div className="border-t border-blue-800 px-3 py-3">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <Mail size={16} className="text-blue-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">Admin Contact</p>
                  {systemConfig.admin_emails.map((email) => (
                    <p key={email} className="text-xs">{email}</p>
                  ))}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-medium text-blue-400 flex items-center gap-1">
                  <Mail size={12} />
                  Admin Contact
                </p>
                {systemConfig.admin_emails.map((email) => (
                  <a
                    key={email}
                    href={`mailto:${email}`}
                    className="block text-xs text-blue-200 hover:text-white truncate"
                    title={email}
                  >
                    {email}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <div className="border-t border-blue-800 p-2">
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="flex w-full items-center justify-center rounded-md px-2 py-2 text-blue-300 hover:bg-blue-800 hover:text-white transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
