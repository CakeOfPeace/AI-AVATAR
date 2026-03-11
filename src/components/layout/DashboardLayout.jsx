import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAuth } from '@/hooks/useApi'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const pageTitles = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your avatar platform' },
  '/avatars': { title: 'My Avatars', subtitle: 'Manage your created avatars' },
  '/create': { title: 'Create Avatar', subtitle: 'Build a new AI avatar' },
  '/admin': { title: 'Admin Panel', subtitle: 'Platform administration' },
  '/admin/users': { title: 'User Management', subtitle: 'Manage platform users' },
  '/admin/requests': { title: 'Change Requests', subtitle: 'Review avatar modification requests' },
}

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, checkAuth, isAuthenticated } = useAuth()

  useEffect(() => {
    checkAuth().then(user => {
      if (!user) {
        navigate('/login')
      }
      setLoading(false)
    })
  }, [])

  // Get page title based on current route
  const getPageInfo = () => {
    // Check for exact match first
    if (pageTitles[location.pathname]) {
      return pageTitles[location.pathname]
    }
    // Check for call route
    if (location.pathname.startsWith('/call/')) {
      return { title: 'Avatar Call', subtitle: 'Live conversation with your avatar' }
    }
    return { title: 'Dashboard', subtitle: '' }
  }

  const pageInfo = getPageInfo()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Sidebar */}
        <Sidebar 
          user={user} 
          onLogout={logout}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main content */}
        <main 
          className={cn(
            'min-h-screen transition-all duration-300',
            sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
          )}
        >
          <Header 
            title={pageInfo.title}
            subtitle={pageInfo.subtitle}
            onMenuClick={() => setMobileMenuOpen(true)}
          />
          
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
