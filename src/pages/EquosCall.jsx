import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  LiveKitRoom,
  VideoTrack,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  useConnectionState,
  useTracks,
  useLocalParticipant,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-styles'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Loader2, 
  AlertCircle,
  ArrowLeft,
  Bot,
  Brain,
  Settings2,
  Play,
  Video,
  VideoOff
} from 'lucide-react'
import { useEquos } from '@/hooks/useEquos'
import { useAuth } from '@/hooks/useApi'
import { cn } from '@/lib/utils'

// Inner component for displaying avatar video - must be inside LiveKitRoom
function AvatarVideoDisplay({ visionEnabled }) {
  const { state, audioTrack } = useVoiceAssistant()
  const connectionState = useConnectionState()
  const { localParticipant, isCameraEnabled } = useLocalParticipant()
  
  // Get all video tracks (including local for self-view)
  const allTracks = useTracks([Track.Source.Camera])
  
  // Get subscribed tracks for avatar video
  const subscribedTracks = useTracks(
    [Track.Source.Camera],
    { onlySubscribed: true }
  )
  
  // Find the avatar's video track (not the local user)
  const avatarVideoTrack = subscribedTracks.find(track => {
    if (!track?.participant?.identity) return false
    if (track.participant.identity.startsWith('user-')) return false
    return track.source === Track.Source.Camera
  })
  
  // Find local user's video track for self-view
  const localVideoTrack = allTracks.find(track => {
    if (!track?.participant?.identity) return false
    return track.participant.identity.startsWith('user-') && track.source === Track.Source.Camera
  })

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Avatar Video Container */}
      <div className="relative w-full max-w-2xl aspect-video bg-black/50 rounded-2xl overflow-hidden border border-border/50">
        {avatarVideoTrack ? (
          <VideoTrack
            trackRef={avatarVideoTrack}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm">Waiting for avatar video...</span>
            </div>
          </div>
        )}

        {/* Connection overlay */}
        {connectionState !== 'connected' && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                {connectionState === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
              </span>
            </div>
          </div>
        )}
        
        {/* Self-view (Picture-in-Picture) - only when vision is enabled */}
        {visionEnabled && (
          <div className="absolute bottom-4 right-4 w-32 h-24 rounded-lg overflow-hidden border-2 border-primary/50 bg-black/80 shadow-lg">
            {localVideoTrack && isCameraEnabled ? (
              <VideoTrack
                trackRef={localVideoTrack}
                className="w-full h-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <VideoOff className="w-6 h-6 text-muted-foreground mx-auto" />
                  <span className="text-xs text-muted-foreground">Camera off</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Audio Visualizer */}
      {audioTrack && (
        <div className="w-full max-w-xs">
          <BarVisualizer
            trackRef={audioTrack}
            state={state}
            barCount={7}
            style={{ height: '48px' }}
          />
        </div>
      )}

      {/* Status Indicator */}
      <div className={cn(
        'px-4 py-2 rounded-full text-sm font-medium transition-colors',
        state === 'listening' && 'bg-green-500/20 text-green-400',
        state === 'thinking' && 'bg-amber-500/20 text-amber-400',
        state === 'speaking' && 'bg-blue-500/20 text-blue-400',
        (!state || state === 'idle') && 'bg-muted text-muted-foreground'
      )}>
        {state === 'listening' && 'Listening...'}
        {state === 'thinking' && 'Thinking...'}
        {state === 'speaking' && 'Speaking...'}
        {(!state || state === 'idle') && 'Ready'}
      </div>
    </div>
  )
}

// Controls component - must be inside LiveKitRoom
function CallControls({ onEnd, sessionInfo, visionEnabled, isStopping }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant()

  const toggleMic = useCallback(async () => {
    if (!localParticipant) return
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
    } catch (err) {
      console.error('Failed to toggle mic:', err)
    }
  }, [localParticipant, isMicrophoneEnabled])

  const toggleCamera = useCallback(async () => {
    if (!localParticipant) return
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled)
    } catch (err) {
      console.error('Failed to toggle camera:', err)
    }
  }, [localParticipant, isCameraEnabled])

  return (
    <div className="p-6 border-t border-border/50 bg-background">
      <div className="flex items-center justify-center gap-4">
        <Button
          variant={isMicrophoneEnabled ? 'default' : 'secondary'}
          size="lg"
          onClick={toggleMic}
          disabled={isStopping}
          className="rounded-full w-14 h-14 p-0 flex items-center justify-center"
        >
          {isMicrophoneEnabled ? (
            <Mic className="w-6 h-6" />
          ) : (
            <MicOff className="w-6 h-6" />
          )}
        </Button>

        {visionEnabled && (
          <Button
            variant={isCameraEnabled ? 'default' : 'secondary'}
            size="lg"
            onClick={toggleCamera}
            disabled={isStopping}
            className="rounded-full w-14 h-14 p-0 flex items-center justify-center"
          >
            {isCameraEnabled ? (
              <Video className="w-6 h-6" />
            ) : (
              <VideoOff className="w-6 h-6" />
            )}
          </Button>
        )}

        <Button
          variant="destructive"
          size="lg"
          onClick={onEnd}
          disabled={isStopping}
          className="rounded-full w-14 h-14 p-0 flex items-center justify-center"
        >
          {isStopping ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <PhoneOff className="w-6 h-6" />
          )}
        </Button>
      </div>
      
      {sessionInfo && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          {isStopping ? (
            'Ending call...'
          ) : (
            <>
              Connected to {sessionInfo.avatarName}
              {sessionInfo.agentName && ` • Agent: ${sessionInfo.agentName}`}
              {visionEnabled && ' • Vision enabled'}
            </>
          )}
        </p>
      )}
    </div>
  )
}

export default function EquosCall() {
  const { avatarId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get auto-start settings from navigation state
  const autoStart = location.state?.autoStart || false
  const navMaxDuration = location.state?.maxDuration
  
  const [avatars, setAvatars] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAvatarId, setSelectedAvatarId] = useState(avatarId || '')
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [maxDuration, setMaxDuration] = useState(navMaxDuration ? String(navMaxDuration) : '120')
  const [additionalCtx, setAdditionalCtx] = useState('')
  
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [loadingResources, setLoadingResources] = useState(true)
  const [error, setError] = useState(null)
  const [autoStarted, setAutoStarted] = useState(false)

  const { listAvatars, listAgents, startSession, stopSession } = useEquos()
  const { isAdmin } = useAuth()

  // Fetch avatars and agents
  useEffect(() => {
    const fetchResources = async () => {
      setLoadingResources(true)
      try {
        const [avatarsResult, agentsResult] = await Promise.all([
          listAvatars(50, 0),
          listAgents(50, 0)
        ])
        setAvatars(avatarsResult.avatars || [])
        setAgents(agentsResult.agents || [])
        
        // Auto-select avatar if passed in URL
        if (avatarId && avatarsResult.avatars?.length) {
          const avatar = avatarsResult.avatars.find(a => a.id === avatarId)
          if (avatar) {
            setSelectedAvatarId(avatar.id)
            setSessionName(`Session with ${avatar.name}`)
            // Auto-select linked agent if available
            if (avatar.agentId) {
              setSelectedAgentId(avatar.agentId)
            }
          }
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoadingResources(false)
      }
    }
    fetchResources()
  }, [avatarId])

  // Auto-start session when coming from avatar card with autoStart flag
  useEffect(() => {
    if (autoStart && !autoStarted && !loadingResources && selectedAvatarId && !session && !loading) {
      setAutoStarted(true)
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        handleStartSession()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [autoStart, autoStarted, loadingResources, selectedAvatarId, session, loading])

  const handleStartSession = useCallback(async () => {
    if (!selectedAvatarId) {
      setError('Please select an avatar')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const sessionData = {
        name: sessionName || `Session ${Date.now()}`,
        avatar: { id: selectedAvatarId },
        ...(selectedAgentId && { agent: { id: selectedAgentId } }),
        ...(maxDuration && { maxDuration: parseInt(maxDuration) }),
        ...(additionalCtx && { additionalCtx }),
        consumerIdentity: {
          identity: `user-${Date.now()}`,
          name: 'User'
        }
      }

      console.log('Starting session with data:', sessionData)
      const result = await startSession(sessionData)
      console.log('Session started:', result)

      if (!result.consumerAccessToken || !result.session?.host?.serverUrl) {
        throw new Error('Invalid session response - missing access token or server URL')
      }

      setSession({
        id: result.session.id,
        serverUrl: result.session.host.serverUrl,
        token: result.consumerAccessToken,
        avatar: result.session.avatar,
        agent: result.session.agent
      })
    } catch (err) {
      console.error('Start session error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedAvatarId, selectedAgentId, sessionName, maxDuration, additionalCtx, startSession])

  const handleEndSession = useCallback(async () => {
    if (stopping) return // Prevent multiple clicks
    
    setStopping(true)
    if (session?.id) {
      try {
        await stopSession(session.id)
      } catch (err) {
        console.error('Stop session error:', err)
      }
    }
    setSession(null)
    setStopping(false)
  }, [session, stopSession, stopping])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (session?.id) {
        stopSession(session.id).catch(() => {})
      }
    }
  }, [session])

  // Loading state
  if (loadingResources) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading resources...</p>
        </div>
      </div>
    )
  }

  // Active session - show call interface
  if (session) {
    const sessionInfo = {
      avatarName: session.avatar?.name || 'Avatar',
      agentName: session.agent?.name
    }
    
    // Check if vision is enabled for this agent
    const visionEnabled = session.agent?.vision === true

    return (
      <TooltipProvider>
        <div className="min-h-screen flex flex-col bg-background relative">
          {/* Stopping overlay */}
          {stopping && (
            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Ending call...</p>
                <p className="text-sm text-muted-foreground">Please wait while we disconnect</p>
              </div>
            </div>
          )}
          
          <LiveKitRoom
            serverUrl={session.serverUrl}
            token={session.token}
            connect={true}
            audio={true}
            video={visionEnabled}
            onDisconnected={handleEndSession}
            onError={(error) => {
              // Suppress participant timing warnings - these are non-critical
              if (error?.message?.includes('participant') && error?.message?.includes('not present')) {
                console.debug('LiveKit timing warning (non-critical):', error.message)
                return
              }
              console.error('LiveKit error:', error)
            }}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <AvatarVideoDisplay visionEnabled={visionEnabled} />
            </div>
            <RoomAudioRenderer />
            <CallControls 
              onEnd={handleEndSession} 
              sessionInfo={sessionInfo} 
              visionEnabled={visionEnabled}
              isStopping={stopping}
            />
          </LiveKitRoom>
        </div>
      </TooltipProvider>
    )
  }

  // Session setup UI
  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="ghost" onClick={() => navigate('/avatars')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Avatars
      </Button>

      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Start Avatar Session
          </CardTitle>
          <CardDescription>
            Configure and start a live conversation with your avatar
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Avatar Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Select Avatar *
            </Label>
            <Select
              value={selectedAvatarId}
              onValueChange={(v) => {
                setSelectedAvatarId(v)
                const avatar = avatars.find(a => a.id === v)
                if (avatar) {
                  setSessionName(`Session with ${avatar.name}`)
                  if (avatar.agentId) {
                    setSelectedAgentId(avatar.agentId)
                  }
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an avatar" />
              </SelectTrigger>
              <SelectContent>
                {avatars.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No avatars available.{' '}
                    <Link to="/create" className="text-primary hover:underline">
                      Create one
                    </Link>
                  </div>
                ) : (
                  avatars.map((avatar) => (
                    <SelectItem key={avatar.id} value={avatar.id}>
                      <div className="flex items-center gap-2">
                        {avatar.thumbnailUrl ? (
                          <img 
                            src={avatar.thumbnailUrl} 
                            alt={avatar.name}
                            className="w-6 h-6 rounded object-cover"
                          />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                        <span>{avatar.name}</span>
                        {avatar.agentId && (
                          <span className="text-xs text-muted-foreground">(with agent)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Agent Selection - Admin Only */}
          {isAdmin && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Select Agent (Optional)
              </Label>
              <Select
                value={selectedAgentId || 'none'}
                onValueChange={(v) => setSelectedAgentId(v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Use avatar's default agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Use avatar's default agent</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name || 'Unnamed Agent'} ({agent.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Override the avatar's linked agent for this session
              </p>
            </div>
          )}

          {/* Session Configuration */}
          <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="w-4 h-4" />
              Session Options
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Session Name</Label>
                <Input
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="My Session"
                />
              </div>

              <div className="space-y-2">
                <Label>Max Duration (seconds)</Label>
                <Input
                  type="number"
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(e.target.value)}
                  placeholder="120"
                  min="60"
                  max="180"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Context (Optional)</Label>
              <Textarea
                value={additionalCtx}
                onChange={(e) => setAdditionalCtx(e.target.value)}
                placeholder="Any additional context or instructions for this session..."
                rows={3}
              />
            </div>
          </div>

          {/* Start Button */}
          <Button
            size="lg"
            onClick={handleStartSession}
            disabled={loading || !selectedAvatarId}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Starting Session...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Start Session
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Your microphone will be used for voice input during the session.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
