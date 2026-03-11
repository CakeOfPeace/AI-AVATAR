import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Bot, 
  PlusCircle, 
  Settings,
  Settings2,
  Users, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Brain, // Used in adminNavItems
  Phone,
  History,
  Key
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const userNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/avatars', icon: Bot, label: 'My Avatars' },
  { to: '/call', icon: Phone, label: 'Start Session' },
  { to: '/sessions', icon: History, label: 'Session History' },
  { to: '/create', icon: PlusCircle, label: 'Create Avatar' },
  { to: '/keys', icon: Key, label: 'API Keys' },
  { to: '/settings', icon: Settings2, label: 'Settings' },
]

const adminNavItems = [
  { to: '/admin', icon: Settings, label: 'Admin Panel', exact: true },
  { to: '/admin/avatars', icon: Bot, label: 'Manage Avatars' },
  { to: '/admin/agents', icon: Brain, label: 'Manage Agents' },
  { to: '/admin/users', icon: Users, label: 'Users' },
]

function NavItem({ to, icon: Icon, label, collapsed, exact }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink
          to={to}
          end={exact}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full',
              'hover:bg-secondary/80 group',
              isActive 
                ? 'bg-primary/10 text-primary' 
                : 'text-muted-foreground hover:text-foreground',
              collapsed && 'justify-center px-2'
            )
          }
        >
          <Icon className={cn('w-5 h-5 flex-shrink-0', collapsed ? '' : 'group-hover:scale-110 transition-transform')} />
          {!collapsed && <span className="font-medium">{label}</span>}
        </NavLink>
      </TooltipTrigger>
      {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
    </Tooltip>
  )
}

export function Sidebar({ user, onLogout, collapsed, onToggleCollapse }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = user?.role === 'admin'

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  return (
    <aside 
      className={cn(
        'fixed left-0 top-0 h-full bg-card border-r border-border/50 flex flex-col transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('p-4 border-b border-border/50', collapsed && 'px-2')}>
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-lg leading-tight">Avatar</h1>
              <p className="text-xs text-muted-foreground">Platform</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {userNavItems.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </div>

        {isAdmin && (
          <>
            <div className={cn('my-4 border-t border-border/50', collapsed && 'mx-2')} />
            {!collapsed && (
              <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Admin
              </p>
            )}
            <div className="space-y-1">
              {adminNavItems.map((item) => (
                <NavItem key={item.to} {...item} collapsed={collapsed} />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* User section */}
      <div className={cn('p-3 border-t border-border/50', collapsed && 'px-2')}>
        {!collapsed && (
          <div className="px-3 py-2 mb-2">
            <p className="font-medium text-sm truncate">{user?.name || user?.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        )}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'default'}
              onClick={handleLogout}
              className={cn(
                'text-muted-foreground hover:text-foreground hover:bg-destructive/10',
                collapsed ? 'w-full' : 'w-full justify-start'
              )}
            >
              <LogOut className="w-4 h-4" />
              {!collapsed && <span className="ml-2">Sign out</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Sign out</TooltipContent>}
        </Tooltip>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border/50 flex items-center justify-center hover:bg-secondary transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  )
}
