import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Clock, 
  Play,
  Bot,
  Brain,
  Loader2,
  AlertCircle,
  Search,
  Calendar,
  Timer,
  MessageSquare,
  ChevronRight,
  FileText,
  RefreshCw,
  User,
  Filter,
  Eye,
  Hash,
  Copy,
  Check,
  ExternalLink,
  Video,
  Mic
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEquos } from '@/hooks/useEquos'
import { useAuth } from '@/hooks/useApi'
import { cn } from '@/lib/utils'

function formatDuration(startedAt, endedAt) {
  if (!startedAt) return 'N/A'
  
  const start = new Date(startedAt)
  const end = endedAt ? new Date(endedAt) : new Date()
  const durationMs = end - start
  
  const minutes = Math.floor(durationMs / 60000)
  const seconds = Math.floor((durationMs % 60000) / 1000)
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}

function SessionCard({ session, onViewTranscript, onViewDetails, showUser = false }) {
  const statusConfig = {
    active: { label: 'Active', color: 'text-green-500 bg-green-500/10 border-green-500/20' },
    ended: { label: 'Ended', color: 'text-muted-foreground bg-secondary border-border/50' },
    error: { label: 'Error', color: 'text-destructive bg-destructive/10 border-destructive/20' }
  }

  const status = statusConfig[session.status] || statusConfig.ended

  return (
    <Card 
      className="glass border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
      onClick={() => onViewDetails(session)}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                  {session.name || 'Unnamed Session'}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(session.startedAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-xs', status.color)}>
                  {status.label}
                </Badge>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
              {showUser && session.user && (
                <div className="flex items-center gap-1 text-blue-500">
                  <User className="w-3 h-3" />
                  <span>{session.user.name || session.user.email || 'Unknown User'}</span>
                </div>
              )}
              {session.avatar && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Bot className="w-3 h-3" />
                  <span>{session.avatar.name || 'Unknown Avatar'}</span>
                </div>
              )}
              {session.agent && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Brain className="w-3 h-3" />
                  <span>{session.agent.name || 'Agent'}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Timer className="w-3 h-3" />
                <span>{formatDuration(session.startedAt, session.endedAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              {session.transcript && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewTranscript(session)
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Transcript
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TranscriptDialog({ session, open, onClose, getSession }) {
  const [loading, setLoading] = useState(false)
  const [fullSession, setFullSession] = useState(null)
  const [error, setError] = useState(null)

  // Fetch full session details when dialog opens
  useEffect(() => {
    if (open && session?.id && !fullSession) {
      const fetchTranscript = async () => {
        setLoading(true)
        setError(null)
        try {
          const data = await getSession(session.id)
          setFullSession(data)
        } catch (err) {
          console.error('Failed to fetch transcript:', err)
          setError(err.message)
        } finally {
          setLoading(false)
        }
      }
      fetchTranscript()
    }
  }, [open, session?.id, getSession])

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setFullSession(null)
      setError(null)
    }
  }, [open])

  if (!session) return null

  // Handle nested transcript structure: transcript.transcription or transcript array
  const rawTranscript = fullSession?.transcript || session.transcript
  const transcript = Array.isArray(rawTranscript) 
    ? rawTranscript 
    : (rawTranscript?.transcription || [])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Session Transcript</DialogTitle>
          <DialogDescription>
            {session.name} • {formatDate(session.startedAt)}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[50vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Failed to load transcript: {error}</p>
            </div>
          ) : Array.isArray(transcript) && transcript.length > 0 ? (
            <div className="space-y-4">
              {transcript.map((entry, index) => {
                // Handle both formats: role/identity field, user/agent values
                const isUser = entry.role === 'user' || entry.identity === 'user'
                const timestamp = entry.timestamp || entry.received_at
                const text = entry.content || entry.text || entry.message
                
                return (
                  <div 
                    key={index}
                    className={cn(
                      "p-3 rounded-lg",
                      isUser 
                        ? "bg-primary/10 ml-8" 
                        : "bg-secondary mr-8"
                    )}
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      {isUser ? (
                        <>
                          <MessageSquare className="w-3 h-3" />
                          <span>You</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3 h-3" />
                          <span>Avatar</span>
                        </>
                      )}
                      {timestamp && (
                        <span className="ml-auto">
                          {new Date(timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm">{text}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No transcript available for this session.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-6 px-2"
      onClick={handleCopy}
      title={`Copy ${label}`}
    >
      {copied ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </Button>
  )
}

function DetailRow({ icon: Icon, label, value, copyable = false, className = '' }) {
  if (!value) return null
  
  return (
    <div className={cn("flex items-start gap-3 py-2", className)}>
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <p className="text-sm font-medium break-all">{value}</p>
          {copyable && <CopyButton value={value} label={label} />}
        </div>
      </div>
    </div>
  )
}

function SessionDetailsDialog({ session, open, onClose, onViewTranscript, getSession }) {
  const [loading, setLoading] = useState(false)
  const [fullSession, setFullSession] = useState(null)
  const [error, setError] = useState(null)

  // Fetch full session details when dialog opens
  useEffect(() => {
    if (open && session?.id && !fullSession) {
      const fetchDetails = async () => {
        setLoading(true)
        setError(null)
        try {
          const data = await getSession(session.id)
          setFullSession(data)
        } catch (err) {
          console.error('Failed to fetch session details:', err)
          setError(err.message)
        } finally {
          setLoading(false)
        }
      }
      fetchDetails()
    }
  }, [open, session?.id, getSession])

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setFullSession(null)
      setError(null)
    }
  }, [open])

  if (!session) return null

  const displaySession = fullSession || session

  const statusConfig = {
    active: { label: 'Active', color: 'text-green-500 bg-green-500/10 border-green-500/20' },
    ended: { label: 'Ended', color: 'text-muted-foreground bg-secondary border-border/50' },
    error: { label: 'Error', color: 'text-destructive bg-destructive/10 border-destructive/20' }
  }

  const status = statusConfig[displaySession.status] || statusConfig.ended

  // Calculate duration in a more readable format
  const getDurationDisplay = () => {
    if (displaySession.durationSeconds) {
      const mins = Math.floor(displaySession.durationSeconds / 60)
      const secs = displaySession.durationSeconds % 60
      if (mins > 0) {
        return `${mins} minute${mins !== 1 ? 's' : ''} ${secs} second${secs !== 1 ? 's' : ''}`
      }
      return `${secs} second${secs !== 1 ? 's' : ''}`
    }
    return formatDuration(displaySession.startedAt, displaySession.endedAt)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{displaySession.name || 'Session Details'}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={cn('text-xs', status.color)}>
                  {status.label}
                </Badge>
                <span className="text-xs">•</span>
                <span>{formatDate(displaySession.startedAt)}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Failed to load session details: {error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Session Identifiers */}
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">Session Information</h4>
                <div className="bg-secondary/30 rounded-lg p-4 space-y-1">
                  <DetailRow 
                    icon={Hash} 
                    label="Session ID" 
                    value={displaySession.id} 
                    copyable 
                  />
                  {displaySession.equosSessionId && displaySession.equosSessionId !== displaySession.id && (
                    <DetailRow 
                      icon={ExternalLink} 
                      label="EQUOS Session ID" 
                      value={displaySession.equosSessionId} 
                      copyable 
                    />
                  )}
                  <DetailRow 
                    icon={Calendar} 
                    label="Started At" 
                    value={formatDate(displaySession.startedAt)} 
                  />
                  {displaySession.endedAt && (
                    <DetailRow 
                      icon={Calendar} 
                      label="Ended At" 
                      value={formatDate(displaySession.endedAt)} 
                    />
                  )}
                  <DetailRow 
                    icon={Timer} 
                    label="Duration" 
                    value={getDurationDisplay()} 
                  />
                </div>
              </div>

              {/* User Information */}
              {displaySession.user && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">User</h4>
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 space-y-1">
                    <DetailRow 
                      icon={User} 
                      label="Name" 
                      value={displaySession.user.name || 'N/A'} 
                    />
                    <DetailRow 
                      icon={MessageSquare} 
                      label="Email" 
                      value={displaySession.user.email} 
                      copyable
                    />
                    {displaySession.user.id && (
                      <DetailRow 
                        icon={Hash} 
                        label="User ID" 
                        value={String(displaySession.user.id)} 
                        copyable
                      />
                    )}
                  </div>
                </div>
              )}

              {/* External User (for API sessions) */}
              {displaySession.externalUserId && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">External User</h4>
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
                    <DetailRow 
                      icon={ExternalLink} 
                      label="External User ID" 
                      value={displaySession.externalUserId} 
                      copyable
                    />
                  </div>
                </div>
              )}

              {/* Avatar Information */}
              {displaySession.avatar && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">Avatar</h4>
                  <div className="bg-secondary/30 rounded-lg p-4 space-y-1">
                    <DetailRow 
                      icon={Bot} 
                      label="Avatar Name" 
                      value={displaySession.avatar.name} 
                    />
                    {displaySession.avatar.id && (
                      <DetailRow 
                        icon={Hash} 
                        label="Avatar ID" 
                        value={displaySession.avatar.id} 
                        copyable
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Agent Information */}
              {displaySession.agent && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">Agent Configuration</h4>
                  <div className="bg-secondary/30 rounded-lg p-4 space-y-1">
                    <DetailRow 
                      icon={Brain} 
                      label="Agent Name" 
                      value={displaySession.agent.name} 
                    />
                    {displaySession.agent.id && (
                      <DetailRow 
                        icon={Hash} 
                        label="Agent ID" 
                        value={displaySession.agent.id} 
                        copyable
                      />
                    )}
                    {displaySession.agent.provider && (
                      <DetailRow 
                        icon={Brain} 
                        label="AI Provider" 
                        value={displaySession.agent.provider} 
                      />
                    )}
                    {displaySession.agent.model && (
                      <DetailRow 
                        icon={Brain} 
                        label="Model" 
                        value={displaySession.agent.model} 
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Session Features */}
              {(displaySession.visionEnabled !== undefined || displaySession.agent?.vision !== undefined) && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">Features</h4>
                  <div className="bg-secondary/30 rounded-lg p-4 flex flex-wrap gap-3">
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border",
                      (displaySession.visionEnabled || displaySession.agent?.vision)
                        ? "bg-green-500/10 border-green-500/30 text-green-500"
                        : "bg-secondary border-border text-muted-foreground"
                    )}>
                      <Eye className="w-4 h-4" />
                      <span className="text-sm font-medium">Vision</span>
                      <Badge variant="outline" className="text-xs ml-1">
                        {(displaySession.visionEnabled || displaySession.agent?.vision) ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-green-500/10 border-green-500/30 text-green-500">
                      <Mic className="w-4 h-4" />
                      <span className="text-sm font-medium">Audio</span>
                      <Badge variant="outline" className="text-xs ml-1">Enabled</Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t">
                {(displaySession.transcript || displaySession.status === 'ended') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      onClose()
                      setTimeout(() => onViewTranscript(displaySession), 100)
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Transcript
                  </Button>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export default function SessionsHistory() {
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [sessions, setSessions] = useState([])
  const [filterOptions, setFilterOptions] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterAvatar, setFilterAvatar] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState(null)
  const [transcriptDialog, setTranscriptDialog] = useState({ open: false, session: null })
  const [detailsDialog, setDetailsDialog] = useState({ open: false, session: null })

  const { listSessions, getSession, loading, error } = useEquos()

  const fetchSessions = async () => {
    setIsLoading(true)
    setPageError(null)
    try {
      // Convert "all" back to empty string for API
      const userFilter = filterUser === 'all' ? '' : filterUser
      const avatarFilter = filterAvatar === 'all' ? '' : filterAvatar
      const result = await listSessions(100, 0, userFilter, avatarFilter)
      setSessions(result.sessions || [])
      if (result.filterOptions) {
        setFilterOptions(result.filterOptions)
      }
    } catch (err) {
      setPageError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [filterUser, filterAvatar])

  const filteredSessions = sessions.filter(session =>
    (session.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (session.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (session.avatar?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (session.agent?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (session.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (session.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleViewTranscript = (session) => {
    setTranscriptDialog({ open: true, session })
  }

  const handleViewDetails = (session) => {
    setDetailsDialog({ open: true, session })
  }

  const clearFilters = () => {
    setFilterUser('all')
    setFilterAvatar('all')
    setSearchQuery('')
  }

  const hasActiveFilters = (filterUser && filterUser !== 'all') || (filterAvatar && filterAvatar !== 'all') || searchQuery

  if (isLoading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchSessions} disabled={isLoading}>
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button onClick={() => navigate('/call')}>
              <Play className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </div>
        </div>

        {/* Filter row - Admin only */}
        {isAdmin && filterOptions && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span>Filters:</span>
            </div>
            
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {filterOptions.users?.map(u => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterAvatar} onValueChange={setFilterAvatar}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Avatars" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Avatars</SelectItem>
                {filterOptions.avatars?.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name || a.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Error state */}
      {(pageError || error) && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{pageError || error}</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sessions.length === 0 && (
        <Card className="glass border-border/50">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No sessions yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start a conversation with one of your avatars to see session history here.
            </p>
            <Button onClick={() => navigate('/call')}>
              <Play className="w-4 h-4 mr-2" />
              Start Your First Session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sessions list */}
      {filteredSessions.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onViewTranscript={handleViewTranscript}
              onViewDetails={handleViewDetails}
              showUser={isAdmin}
            />
          ))}
        </div>
      )}

      {/* No results */}
      {searchQuery && filteredSessions.length === 0 && sessions.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No sessions found matching "{searchQuery}"</p>
        </div>
      )}

      {/* Transcript Dialog */}
      <TranscriptDialog
        session={transcriptDialog.session}
        open={transcriptDialog.open}
        onClose={() => setTranscriptDialog({ open: false, session: null })}
        getSession={getSession}
      />

      {/* Session Details Dialog */}
      <SessionDetailsDialog
        session={detailsDialog.session}
        open={detailsDialog.open}
        onClose={() => setDetailsDialog({ open: false, session: null })}
        onViewTranscript={handleViewTranscript}
        getSession={getSession}
      />
    </div>
  )
}
