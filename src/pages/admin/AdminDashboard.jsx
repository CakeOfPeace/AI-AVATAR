import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Bot, 
  Users, 
  Clock,
  TrendingUp,
  ArrowRight,
  Activity,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Brain,
  Zap,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAdmin } from '@/hooks/useApi'
import { useEquos } from '@/hooks/useEquos'
import { cn } from '@/lib/utils'

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

function HealthStatusCard({ status, version }) {
  const isHealthy = status === 'ok'
  
  return (
    <Card className="glass border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            isHealthy 
              ? "bg-green-500/20 border border-green-500/20" 
              : "bg-destructive/20 border border-destructive/20"
          )}>
            {isHealthy ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <XCircle className="w-6 h-6 text-destructive" />
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">API Status</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant="outline" 
                className={cn(
                  isHealthy 
                    ? "text-green-500 bg-green-500/10" 
                    : "text-destructive bg-destructive/10"
                )}
              >
                {isHealthy ? 'Healthy' : 'Unhealthy'}
              </Badge>
              {version && (
                <span className="text-xs text-muted-foreground">v{version}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LimitsCard({ limits }) {
  if (!limits) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>No organization limits set</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Organization Limits
        </CardTitle>
        <CardDescription>API usage limits</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(limits).map(([key, value]) => (
            <div key={key} className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </p>
              <p className="text-lg font-semibold mt-1">{value || 'Unlimited'}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const [equosHealth, setEquosHealth] = useState(null)
  const [equosLimits, setEquosLimits] = useState(null)
  const [equosStats, setEquosStats] = useState({ agents: 0, avatars: 0, sessions: 0, totalMinutes: 0 })
  const [equosLoading, setEquosLoading] = useState(true)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  
  const { stats, loading, error, fetchStats } = useAdmin()
  const { healthCheck, getLimits, listAgents, listAvatars, listSessions, syncOwnership } = useEquos()

  // Calculate total minutes from EQUOS sessions
  const calculateTotalMinutes = (sessions) => {
    if (!sessions || !sessions.length) return 0
    
    let totalMs = 0
    sessions.forEach(session => {
      if (session.startedAt && session.endedAt) {
        const start = new Date(session.startedAt).getTime()
        const end = new Date(session.endedAt).getTime()
        if (end > start) {
          totalMs += (end - start)
        }
      }
    })
    
    return Math.round(totalMs / 60000) // Convert to minutes
  }

  const fetchEquosData = async () => {
    setEquosLoading(true)
    try {
      const [health, limits, agents, avatars, sessions] = await Promise.allSettled([
        healthCheck(),
        getLimits(),
        listAgents(1, 0), // Just get count
        listAvatars(1, 0),
        listSessions(50, 0) // Get sessions with data to calculate duration
      ])
      
      if (health.status === 'fulfilled') {
        setEquosHealth(health.value)
      }
      if (limits.status === 'fulfilled') {
        setEquosLimits(limits.value)
      }
      
      // Calculate total minutes from session data
      const sessionData = sessions.status === 'fulfilled' ? sessions.value.sessions : []
      const totalMinutes = calculateTotalMinutes(sessionData)
      
      setEquosStats({
        agents: agents.status === 'fulfilled' ? agents.value.total : 0,
        avatars: avatars.status === 'fulfilled' ? avatars.value.total : 0,
        sessions: sessions.status === 'fulfilled' ? sessions.value.total : 0,
        totalMinutes
      })
    } catch (err) {
      console.error('Failed to fetch EQUOS data:', err)
    } finally {
      setEquosLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncLoading(true)
    setSyncResult(null)
    try {
      const result = await syncOwnership()
      setSyncResult(result)
      // Refresh data after sync
      fetchEquosData()
      fetchStats()
    } catch (err) {
      setSyncResult({ error: err.message })
    } finally {
      setSyncLoading(false)
    }
  }

  useEffect(() => {
    fetchStats().catch(() => {})
    fetchEquosData()
  }, [])

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className={cn(
          "p-4 rounded-lg flex items-center gap-2",
          syncResult.error 
            ? "bg-destructive/10 text-destructive"
            : "bg-green-500/10 text-green-500"
        )}>
          {syncResult.error ? (
            <>
              <XCircle className="w-5 h-5" />
              <span>Sync failed: {syncResult.error}</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>
                Synced {syncResult.synced?.avatars || 0} avatars and {syncResult.synced?.agents || 0} agents to admin ownership
              </span>
            </>
          )}
        </div>
      )}

      {/* EQUOS Status Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HealthStatusCard 
          status={equosHealth?.status} 
          version={equosHealth?.version} 
        />
        
        <Card className="glass border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">EQUOS Agents</p>
                <p className="text-2xl font-bold mt-1">
                  {equosLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : equosStats.agents}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/20 flex items-center justify-center">
                <Bot className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">EQUOS Avatars</p>
                <p className="text-2xl font-bold mt-1">
                  {equosLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : equosStats.avatars}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Total Sessions"
          value={equosStats.sessions}
          icon={Activity}
          color="green"
        />
        <StatCard
          title="EQUOS Avatars"
          value={equosStats.avatars}
          icon={Bot}
          color="primary"
        />
        <StatCard
          title="EQUOS Agents"
          value={equosStats.agents}
          icon={Brain}
          color="purple"
        />
      </div>

      {/* Sync and Organization limits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sync Card */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Sync EQUOS Data
            </CardTitle>
            <CardDescription>
              Sync existing EQUOS avatars and agents to local ownership tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              If avatars or agents were created directly in EQUOS, click sync to assign 
              them to your admin account. This enables proper user-based filtering.
            </p>
            <Button 
              onClick={handleSync} 
              disabled={syncLoading}
              className="w-full"
            >
              {syncLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Ownership Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <LimitsCard limits={equosLimits} />
      </div>

      {/* Usage stats */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">This Month</CardTitle>
          <CardDescription>Local usage statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-2xl font-bold">{equosStats.sessions}</p>
              <p className="text-sm text-muted-foreground">Total Sessions</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-2xl font-bold">{equosStats.totalMinutes}m</p>
              <p className="text-sm text-muted-foreground">Total Minutes</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-2xl font-bold">{equosStats.avatars}</p>
              <p className="text-sm text-muted-foreground">Avatars</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
              <p className="text-sm text-muted-foreground">Platform Users</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Admin management shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link 
              to="/admin/users"
              className="p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Manage Users</p>
                  <p className="text-xs text-muted-foreground">{stats?.totalUsers || 0} users</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>

            <Link 
              to="/admin/agents"
              className="p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Manage Agents</p>
                  <p className="text-xs text-muted-foreground">{equosStats.agents} agents</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>

            <Link 
              to="/admin/avatars"
              className="p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Manage Avatars</p>
                  <p className="text-xs text-muted-foreground">{equosStats.avatars} avatars</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>

            <Link 
              to="/sessions"
              className="p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Session History</p>
                  <p className="text-xs text-muted-foreground">{equosStats.sessions} sessions</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
