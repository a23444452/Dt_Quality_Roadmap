import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/features/auth/AuthContext'

interface NavItem {
  label: string
  icon: React.ElementType
  to: string
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  { label: 'Solution Map', icon: Grid3X3, to: '/solution-map' },
  { label: 'Process Map', icon: GitBranch, to: '/process-map' },
  { label: 'Data Management', icon: Database, to: '/data-management' },
  { label: 'Process Analysis', icon: Activity, to: '/analysis/process' },
]

const adminNavItems: NavItem[] = [
  { label: 'User Management', icon: Users, to: '/admin/users' },
  { label: 'Settings', icon: Settings, to: '/admin/settings' },
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
          <NavLink to={item.to} className={linkClasses}>
            <Icon size={20} className="shrink-0" />
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{item.label}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <NavLink to={item.to} className={linkClasses}>
      <Icon size={20} className="shrink-0" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuth()

  const isAdmin = user?.role === 'admin'

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
              {adminNavItems.map((item) => (
                <SidebarNavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </>
          )}
        </nav>

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
