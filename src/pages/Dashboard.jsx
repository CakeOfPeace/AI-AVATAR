import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Bot, 
  Users, 
  Clock, 
  Brain, 
  TrendingUp,
  PlusCircle,
  ArrowRight,
  Activity,
  Phone
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAdmin, useAuth } from '@/hooks/useApi'
import { useEquos } from '@/hooks/useEquos'

function StatCard({ title, value, icon: Icon, description, trend, color = 'primary' }) {
  const colorClasses = {
    primary: 'from-primary/20 to-primary/5 border-primary/20 text-primary',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-500',
    green: 'from-green-500/20 to-green-500/5 border-green-500/20 text-green-500',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-500',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-500',
  }

  return (
    <Card className="glass border-border/50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2 text-green-500 text-sm">
                <TrendingUp className="w-3 h-3" />
                <span>{trend}</span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} border flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityItem({ session }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Activity className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {session.name || 'Avatar Session'}
        </p>
        <p className="text-xs text-muted-foreground">
          {session.avatar?.name || 'Unknown Avatar'}
          {session.status === 'active' ? ' - Active' : ''}
        </p>
      </div>
      <span className="text-xs text-muted-foreground">
        {formatTime(session.startedAt)}
      </span>
    </div>
  )
}

export default function Dashboard() {
  const [recentSessions, setRecentSessions] = useState([])
  const [equosStats, setEquosStats] = useState({ avatars: 0, agents: 0 })
  const [loadingEquos, setLoadingEquos] = useState(true)
  const { user, isAdmin } = useAuth()
  const { stats, fetchStats } = useAdmin()
  const { listAvatars, listAgents, listSessions } = useEquos()

  useEffect(() => {
    // Fetch EQUOS data
    const fetchEquosData = async () => {
      setLoadingEquos(true)
      try {
        const [avatarsRes, agentsRes, sessionsRes] = await Promise.all([
          listAvatars(100, 0),
          listAgents(100, 0),
          listSessions(10, 0)
        ])
        setEquosStats({
          avatars: avatarsRes.avatars?.length || 0,
          agents: agentsRes.agents?.length || 0
        })
        setRecentSessions(sessionsRes.sessions || [])
      } catch (err) {
        console.error('Failed to fetch EQUOS data:', err)
      } finally {
        setLoadingEquos(false)
      }
    }
    
    fetchEquosData()
    
    if (isAdmin) {
      fetchStats().catch(() => {})
    }
  }, [isAdmin])

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h2>
          <p className="text-muted-foreground">
            Here's what's happening with your avatars today
          </p>
        </div>
        <Button asChild>
          <Link to="/create">
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Avatar
          </Link>
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Avatars"
          value={loadingEquos ? '...' : equosStats.avatars}
          icon={Bot}
          color="primary"
        />
        <StatCard
          title="Total Agents"
          value={loadingEquos ? '...' : equosStats.agents}
          icon={Brain}
          description="AI configurations"
          color="green"
        />
        {isAdmin ? (
          <>
            <StatCard
              title="Total Users"
              value={stats?.totalUsers || 0}
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Active Sessions"
              value={recentSessions.filter(s => s.status === 'active').length}
              icon={Phone}
              description="Currently running"
              color="amber"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Recent Sessions"
              value={recentSessions.length}
              icon={Clock}
              description="Latest calls"
              color="blue"
            />
            <StatCard
              title="Active Now"
              value={recentSessions.filter(s => s.status === 'active').length}
              icon={Phone}
              description="Running sessions"
              color="amber"
            />
          </>
        )}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <Card className="glass border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link 
                to="/create"
                className="p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <PlusCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Create New Avatar</p>
                    <p className="text-sm text-muted-foreground">Set up a new AI assistant</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>

              <Link 
                to="/avatars"
                className="p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">View My Avatars</p>
                    <p className="text-sm text-muted-foreground">Manage existing avatars</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>

              <Link 
                to="/agents"
                className="p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Manage Agents</p>
                    <p className="text-sm text-muted-foreground">AI configurations</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>

              {isAdmin && (
                <Link 
                  to="/admin/users"
                  className="p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Manage Users</p>
                      <p className="text-sm text-muted-foreground">User administration</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Recent Sessions</CardTitle>
            <CardDescription>Latest avatar conversations</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSessions.length > 0 ? (
              <div className="space-y-1">
                {recentSessions.slice(0, 5).map((session) => (
                  <ActivityItem key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent sessions</p>
                <Link to="/call" className="text-primary text-sm hover:underline mt-2 inline-block">
                  Start a session
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
