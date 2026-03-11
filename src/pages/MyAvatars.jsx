import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Bot, 
  Phone, 
  Edit, 
  Trash2, 
  MoreVertical,
  PlusCircle,
  AlertCircle,
  Loader2,
  Search,
  RefreshCw,
  Brain,
  User as UserIcon,
  Globe,
  Heart,
  Database,
  Eye,
  Clock,
  Settings
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { useEquos } from '@/hooks/useEquos'
import { useAuth } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { 
  providers, 
  getVoicesByProvider, 
  getModelsByProvider,
  agentFeatures
} from '@/data/equos'

const MAX_INSTRUCTIONS_LENGTH = 5500

// Helper to convert seconds to minutes for display
const secondsToMinutes = (seconds) => Math.round((seconds || 120) / 60)
// Helper to convert minutes to seconds for storage
const minutesToSeconds = (minutes) => Math.round(minutes * 60)

// Edit Avatar Modal - for editing combined avatar + agent
function EditAvatarModal({ avatar, open, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('avatar')
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    // Avatar fields
    name: '',
    identity: '',
    maxDurationMinutes: 2, // Default 2 minutes, displayed in minutes
    // Agent fields (if linked)
    agentName: '',
    provider: 'gemini',
    model: '',
    voice: '',
    instructions: '',
    greetingMsg: '',
    search: false,
    emotions: false,
    memory: false,
    vision: false
  })

  // Populate form when avatar changes
  useEffect(() => {
    if (avatar) {
      setFormData({
        name: avatar.name || '',
        identity: avatar.identity || '',
        maxDurationMinutes: secondsToMinutes(avatar.maxDuration),
        agentName: avatar.agent?.name || avatar.name || '',
        provider: avatar.agent?.provider || 'gemini',
        model: avatar.agent?.model || '',
        voice: avatar.agent?.voice || '',
        instructions: avatar.agent?.instructions || '',
        greetingMsg: avatar.agent?.greetingMsg || '',
        search: avatar.agent?.search || false,
        emotions: avatar.agent?.emotions || false,
        memory: avatar.agent?.memory || false,
        vision: avatar.agent?.vision || false
      })
    }
  }, [avatar])

  const voices = getVoicesByProvider(formData.provider)
  const models = getModelsByProvider(formData.provider)

  const handleProviderChange = (provider) => {
    const newModels = getModelsByProvider(provider)
    const newVoices = getVoicesByProvider(provider)
    setFormData({
      ...formData,
      provider,
      model: newModels[0]?.id || '',
      voice: newVoices[0]?.id || ''
    })
  }

  const handleSave = async () => {
    if (formData.instructions.length > MAX_INSTRUCTIONS_LENGTH) {
      return // Prevent saving
    }
    setSaving(true)
    try {
      await onSave(avatar, formData)
      onClose()
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!avatar) return null

  const hasAgent = !!avatar.agentId
  const instructionsTooLong = formData.instructions.length > MAX_INSTRUCTIONS_LENGTH

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary" />
            Edit Avatar
          </DialogTitle>
          <DialogDescription>
            Update your avatar and its AI agent configuration
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="avatar" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Avatar
            </TabsTrigger>
            <TabsTrigger value="agent" className="flex items-center gap-2" disabled={!hasAgent}>
              <Brain className="w-4 h-4" />
              Agent
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Avatar Tab */}
          <TabsContent value="avatar" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Avatar Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter avatar name"
              />
            </div>

            <div className="space-y-2">
              <Label>Identity</Label>
              <Input
                value={formData.identity}
                onChange={(e) => setFormData({ ...formData, identity: e.target.value })}
                placeholder="Unique identifier"
                disabled
              />
              <p className="text-xs text-muted-foreground">Identity cannot be changed after creation</p>
            </div>

            {/* Avatar preview */}
            {avatar.thumbnailUrl && (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-secondary">
                  <img 
                    src={avatar.thumbnailUrl} 
                    alt={avatar.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium">{formData.name || 'Unnamed Avatar'}</p>
                  <p className="text-sm text-muted-foreground">{formData.identity}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Note: Avatar image cannot be changed after creation
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Agent Tab */}
          <TabsContent value="agent" className="space-y-4 mt-4">
            {hasAgent ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Agent Name</Label>
                    <Input
                      value={formData.agentName}
                      onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
                      placeholder="Agent name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select
                      value={formData.provider}
                      onValueChange={handleProviderChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {models.length > 0 && (
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Select
                        value={formData.model}
                        onValueChange={(v) => setFormData({ ...formData, model: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {voices.length > 0 && (
                    <div className="space-y-2">
                      <Label>Voice</Label>
                      <Select
                        value={formData.voice}
                        onValueChange={(v) => setFormData({ ...formData, voice: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select voice" />
                        </SelectTrigger>
                        <SelectContent>
                          {voices.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name} ({v.gender})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Instructions (System Prompt)</Label>
                  <Textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Enter the system prompt for this agent..."
                    rows={6}
                    className={instructionsTooLong ? 'border-destructive' : ''}
                  />
                  <p className={`text-xs ${instructionsTooLong ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {formData.instructions.length} / {MAX_INSTRUCTIONS_LENGTH} characters
                    {instructionsTooLong && (
                      <span className="ml-2 font-medium">
                        (Exceeds limit - cannot save)
                      </span>
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Greeting Message</Label>
                  <Textarea
                    value={formData.greetingMsg}
                    onChange={(e) => setFormData({ ...formData, greetingMsg: e.target.value })}
                    placeholder="Enter the initial greeting message..."
                    rows={2}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Features</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {agentFeatures.map((feature) => (
                      <div 
                        key={feature.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50"
                      >
                        <div className="flex items-center gap-2">
                          {feature.id === 'search' && <Globe className="w-4 h-4 text-muted-foreground" />}
                          {feature.id === 'emotions' && <Heart className="w-4 h-4 text-muted-foreground" />}
                          {feature.id === 'memory' && <Database className="w-4 h-4 text-muted-foreground" />}
                          {feature.id === 'vision' && <Eye className="w-4 h-4 text-muted-foreground" />}
                          <span className="text-sm">{feature.name}</span>
                        </div>
                        <Switch
                          checked={formData[feature.id]}
                          onCheckedChange={(c) => setFormData({ ...formData, [feature.id]: c })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No agent linked to this avatar</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create a new avatar to have an agent automatically linked.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4" />
                Call Duration Settings
              </div>
              
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-4">
                <div className="space-y-2">
                  <Label>Maximum Call Duration</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={formData.maxDurationMinutes}
                      onChange={(e) => {
                        const value = Math.min(120, Math.max(1, parseInt(e.target.value) || 1))
                        setFormData({ ...formData, maxDurationMinutes: value })
                      }}
                      min={1}
                      max={120}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set the maximum duration for calls with this avatar. Maximum allowed is 120 minutes (2 hours).
                  </p>
                </div>

                {/* Duration presets */}
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15, 30, 60, 120].map((mins) => (
                    <Button
                      key={mins}
                      variant={formData.maxDurationMinutes === mins ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, maxDurationMinutes: mins })}
                    >
                      {mins < 60 ? `${mins} min` : `${mins / 60} hr${mins > 60 ? 's' : ''}`}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Current Settings Summary */}
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-2">Current Settings</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Call Duration:</div>
                  <div>{formData.maxDurationMinutes} minutes</div>
                  <div className="text-muted-foreground">Vision:</div>
                  <div>{formData.vision ? 'Enabled' : 'Disabled'}</div>
                  <div className="text-muted-foreground">Voice:</div>
                  <div>{formData.voice || 'Default'}</div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || instructionsTooLong}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AvatarCard({ avatar, onCall, onEdit, onDelete, isAdmin }) {
  // EQUOS avatars have different structure
  const hasAgent = !!avatar.agentId

  return (
    <Card className="glass border-border/50 hover:border-primary/30 transition-all group overflow-hidden">
      {/* Large Avatar Image */}
      <div className="relative aspect-square bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {avatar.thumbnailUrl ? (
          <img 
            src={avatar.thumbnailUrl} 
            alt={avatar.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Bot className="w-16 h-16 text-primary/50" />
          </div>
        )}

        {/* Dropdown menu overlay */}
        <div className="absolute top-3 left-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-8 w-8 backdrop-blur-sm bg-background/80">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onCall(avatar)} disabled={!hasAgent}>
                <Phone className="w-4 h-4 mr-2" />
                Start Call
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(avatar)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Avatar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(avatar)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg truncate">{avatar.name}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {avatar.identity || 'No identity set'}
            </p>
          </div>

          {/* Agent info */}
          {avatar.agent && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Brain className="w-3 h-3" />
              <span>Agent: {avatar.agent.name || avatar.agentId}</span>
            </div>
          )}

          {/* Creator info for admin */}
          {isAdmin && avatar.owner && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <UserIcon className="w-3 h-3" />
              Created by: {avatar.owner.owner_name || avatar.owner.owner_email || 'Unknown'}
            </p>
          )}

          {/* Actions */}
          <div className="pt-2">
            <Button size="sm" onClick={() => onCall(avatar)} disabled={!hasAgent} className="w-full">
              <Phone className="w-4 h-4 mr-2" />
              Start Call
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MyAvatars() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [avatars, setAvatars] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, avatar: null })
  const [editDialog, setEditDialog] = useState({ open: false, avatar: null })
  
  const { listAvatars, deleteAvatar, updateAvatar, updateAgent, loading, error } = useEquos()
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const fetchAvatars = async () => {
    setIsLoading(true)
    setPageError(null)
    try {
      const result = await listAvatars(50, 0)
      setAvatars(result.avatars || [])
    } catch (err) {
      setPageError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAvatars()
  }, [])

  const filteredAvatars = avatars.filter(avatar =>
    (avatar.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (avatar.identity || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (avatar.client || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCall = (avatar) => {
    // Navigate to EQUOS call page with avatar ID and auto-start flag
    navigate(`/call/${avatar.id}`, { 
      state: { 
        autoStart: true,
        maxDuration: avatar.maxDuration || 120 
      } 
    })
  }

  const handleDelete = (avatar) => {
    setDeleteDialog({ open: true, avatar })
  }

  const handleEdit = (avatar) => {
    setEditDialog({ open: true, avatar })
  }

  const handleSaveEdit = async (avatar, formData) => {
    try {
      // Track if any updates were made
      let updated = false

      // Update avatar (name and maxDuration)
      const avatarUpdates = {
        name: formData.name,
        maxDuration: minutesToSeconds(formData.maxDurationMinutes)
      }
      
      if (formData.name !== avatar.name || minutesToSeconds(formData.maxDurationMinutes) !== avatar.maxDuration) {
        await updateAvatar(avatar.id, avatarUpdates)
        updated = true
      }

      // Update agent if linked
      if (avatar.agentId) {
        // Build agent update payload - only include fields that changed
        // The backend will merge with existing values
        const agentUpdates = {
          name: formData.agentName,
          provider: formData.provider,
          model: formData.model || undefined,
          voice: formData.voice || undefined,
          instructions: formData.instructions || '',
          greetingMsg: formData.greetingMsg || '',
          search: formData.search,
          emotions: formData.emotions,
          memory: formData.memory,
          vision: formData.vision
        }

        await updateAgent(avatar.agentId, agentUpdates)
        updated = true
      }

      toast({
        title: updated ? 'Avatar Updated' : 'No Changes',
        description: updated 
          ? `"${formData.name}" has been updated successfully.`
          : 'No changes were detected.',
      })
      
      fetchAvatars() // Refresh list
    } catch (err) {
      console.error('Failed to update avatar:', err)
      toast({
        title: 'Error',
        description: `Failed to update avatar: ${err.message}`,
        variant: 'destructive',
      })
      throw err
    }
  }

  const confirmDelete = async () => {
    if (!deleteDialog.avatar) return
    
    try {
      await deleteAvatar(deleteDialog.avatar.id)
      toast({
        title: 'Avatar Deleted',
        description: `Avatar "${deleteDialog.avatar.name}" has been deleted.`,
      })
      setDeleteDialog({ open: false, avatar: null })
      fetchAvatars() // Refresh list
    } catch (err) {
      console.error('Failed to delete avatar:', err)
      toast({
        title: 'Error',
        description: `Failed to delete avatar: ${err.message}`,
        variant: 'destructive',
      })
    }
  }

  if (isLoading && avatars.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your avatars...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search avatars..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchAvatars} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button asChild>
            <Link to="/create">
              <PlusCircle className="w-4 h-4 mr-2" />
              Create Avatar
            </Link>
          </Button>
        </div>
      </div>

      {/* Admin badge */}
      {isAdmin && (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
          <UserIcon className="w-3 h-3 mr-1" /> Admin View - All Avatars
        </Badge>
      )}

      {/* Error state */}
      {(pageError || error) && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{pageError || error}</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && avatars.length === 0 && (
        <Card className="glass border-border/50">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No avatars yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first AI avatar to get started with voice conversations.
            </p>
            <Button asChild>
              <Link to="/create">
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Your First Avatar
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Avatars grid */}
      {filteredAvatars.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredAvatars.map((avatar) => (
            <AvatarCard
              key={avatar.id}
              avatar={avatar}
              onCall={handleCall}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* No results */}
      {searchQuery && filteredAvatars.length === 0 && avatars.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No avatars found matching "{searchQuery}"</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, avatar: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Avatar</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.avatar?.name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Avatar Modal */}
      <EditAvatarModal
        avatar={editDialog.avatar}
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, avatar: null })}
        onSave={handleSaveEdit}
      />
    </div>
  )
}
