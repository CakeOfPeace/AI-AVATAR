import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useApi'
import { 
  Bot, 
  PlusCircle,
  Search,
  Loader2,
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
  Brain,
  Globe,
  Heart,
  Database,
  CheckCircle,
  Cpu,
  User
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useEquos } from '@/hooks/useEquos'
import { 
  providers, 
  getVoicesByProvider, 
  getModelsByProvider,
  agentFeatures 
} from '@/data/equos'
import { cn } from '@/lib/utils'

function AgentCard({ agent, onEdit, onDelete, showOwner = false }) {
  const providerConfig = {
    gemini: { label: 'Gemini', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    openai: { label: 'OpenAI', color: 'text-green-500 bg-green-500/10 border-green-500/20' },
    elevenlabs: { label: 'ElevenLabs', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' }
  }

  const providerInfo = providerConfig[agent.provider] || providerConfig.gemini

  return (
    <Card className="glass border-border/50 hover:border-primary/30 transition-all group">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Brain className="w-7 h-7 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold truncate">{agent.name || 'Unnamed Agent'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={cn('text-xs', providerInfo.color)}>
                    {providerInfo.label}
                  </Badge>
                  {agent.model && (
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {agent.model.split('-').slice(0, 2).join('-')}
                    </span>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(agent)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Agent
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(agent)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {agent.voice && (
              <p className="text-sm text-muted-foreground mt-1">
                Voice: {agent.voice}
              </p>
            )}

            {agent.instructions && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {agent.instructions}
              </p>
            )}

            <div className="flex items-center gap-3 mt-3">
              {agent.search && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Globe className="w-3 h-3" />
                  <span>Search</span>
                </div>
              )}
              {agent.emotions && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Heart className="w-3 h-3" />
                  <span>Emotions</span>
                </div>
              )}
              {agent.memory && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Database className="w-3 h-3" />
                  <span>Memory</span>
                </div>
              )}
            </div>

            {/* Show owner info for admins */}
            {showOwner && agent.owner && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Created by: <span className="text-foreground">{agent.owner.owner_name || agent.owner.owner_email || 'Unknown'}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EditAgentModal({ agent, open, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    provider: 'gemini',
    model: '',
    voice: '',
    instructions: '',
    greetingMsg: '',
    search: false,
    emotions: false,
    memory: false
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || '',
        provider: agent.provider || 'gemini',
        model: agent.model || '',
        voice: agent.voice || '',
        instructions: agent.instructions || '',
        greetingMsg: agent.greetingMsg || '',
        search: agent.search || false,
        emotions: agent.emotions || false,
        memory: agent.memory || false
      })
    }
  }, [agent])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        ...formData,
        id: agent.id,
        organizationId: agent.organizationId
      })
      onClose()
    } catch (err) {
      console.error('Failed to save agent:', err)
    } finally {
      setSaving(false)
    }
  }

  const voices = getVoicesByProvider(formData.provider)
  const models = getModelsByProvider(formData.provider)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>
            Modify the agent configuration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Agent name"
              />
            </div>

            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={(v) => setFormData({ 
                  ...formData, 
                  provider: v,
                  model: getModelsByProvider(v)[0]?.id || '',
                  voice: getVoicesByProvider(v)[0]?.id || ''
                })}
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
          </div>

          <div className="space-y-2">
            <Label>Instructions (System Prompt)</Label>
            <Textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value.slice(0, 5500) })}
              placeholder="Enter the system prompt for this agent..."
              rows={4}
            />
            <div className="flex justify-end text-xs text-muted-foreground">
              <span className={cn(formData.instructions.length >= 5500 && "text-destructive font-medium")}>
                {formData.instructions.length}/5500
              </span>
            </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {agentFeatures.map((feature) => (
                <div 
                  key={feature.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50"
                >
                  <div className="flex items-center gap-2">
                    {feature.id === 'search' && <Globe className="w-4 h-4 text-muted-foreground" />}
                    {feature.id === 'emotions' && <Heart className="w-4 h-4 text-muted-foreground" />}
                    {feature.id === 'memory' && <Database className="w-4 h-4 text-muted-foreground" />}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
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

export default function Agents() {
  const { user, isAdmin: userIsAdmin } = useAuth()
  
  // Redirect non-admin users to avatars page
  // Agents are now created automatically via Create Avatar for regular users
  if (!userIsAdmin) {
    return <Navigate to="/avatars" replace />
  }

  const [agents, setAgents] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialog, setDeleteDialog] = useState({ open: false, agent: null })
  const [editDialog, setEditDialog] = useState({ open: false, agent: null })
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const { listAgents, updateAgent, deleteAgent, loading, error } = useEquos()

  const fetchAgents = async () => {
    setIsLoading(true)
    setPageError(null)
    try {
      const result = await listAgents(50, 0)
      setAgents(result.agents || [])
      setIsAdmin(result.isAdmin || false)
    } catch (err) {
      setPageError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  const filteredAgents = agents.filter(agent =>
    (agent.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (agent.provider || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (agent.owner?.owner_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (agent.owner?.owner_email || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEdit = (agent) => {
    setEditDialog({ open: true, agent })
  }

  const handleSaveEdit = async (agentData) => {
    await updateAgent(agentData.id, agentData)
    await fetchAgents()
  }

  const handleDelete = (agent) => {
    setDeleteDialog({ open: true, agent })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.agent) return
    
    try {
      await deleteAgent(deleteDialog.agent.id)
      setDeleteDialog({ open: false, agent: null })
      await fetchAgents()
    } catch (err) {
      console.error('Failed to delete agent:', err)
    }
  }

  if (isLoading && agents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading agents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isAdmin ? "Search agents, owners..." : "Search agents..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {isAdmin && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
              Admin View - All Agents
            </Badge>
          )}
        </div>
        
        <Button asChild>
          <Link to="/agents/create">
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Agent
          </Link>
        </Button>
      </div>

      {/* Error state */}
      {(pageError || error) && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{pageError || error}</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && agents.length === 0 && (
        <Card className="glass border-border/50">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No agents yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {isAdmin 
                ? "No agents have been created by any user yet."
                : "Create your first AI agent to power your avatars with intelligent conversations."
              }
            </p>
            <Button asChild>
              <Link to="/agents/create">
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Your First Agent
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Agents grid */}
      {filteredAgents.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={handleEdit}
              onDelete={handleDelete}
              showOwner={isAdmin}
            />
          ))}
        </div>
      )}

      {/* No results */}
      {searchQuery && filteredAgents.length === 0 && agents.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No agents found matching "{searchQuery}"</p>
        </div>
      )}

      {/* Edit Agent Modal */}
      <EditAgentModal
        agent={editDialog.agent}
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, agent: null })}
        onSave={handleSaveEdit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, agent: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.agent?.name || 'this agent'}"? 
              This action cannot be undone and will affect any avatars linked to this agent.
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
    </div>
  )
}
