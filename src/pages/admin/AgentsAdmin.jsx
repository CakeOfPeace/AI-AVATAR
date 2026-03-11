import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Brain,
  PlusCircle,
  Search,
  Loader2,
  AlertCircle,
  MoreVertical,
  Trash2,
  Eye,
  Globe,
  Heart,
  Database,
  RefreshCw,
  ExternalLink,
  User as UserIcon
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEquos } from '@/hooks/useEquos'
import { cn } from '@/lib/utils'

function AgentDetailDialog({ agent, open, onClose }) {
  if (!agent) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            {agent.name || 'Unnamed Agent'}
          </DialogTitle>
          <DialogDescription>
            Full agent configuration and details
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[50vh] pr-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">ID</p>
                <p className="text-sm font-mono mt-1 truncate">{agent.id}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Organization ID</p>
                <p className="text-sm font-mono mt-1 truncate">{agent.organizationId}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Provider</p>
                <p className="text-sm font-medium mt-1 capitalize">{agent.provider}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Model</p>
                <p className="text-sm font-medium mt-1 truncate">{agent.model || 'Default'}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Voice</p>
                <p className="text-sm font-medium mt-1">{agent.voice || 'Default'}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Features</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <Globe className={cn("w-4 h-4", agent.search ? "text-green-500" : "text-muted-foreground")} />
                  <span className={cn("text-sm", agent.search ? "" : "text-muted-foreground")}>
                    Search {agent.search ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className={cn("w-4 h-4", agent.emotions ? "text-green-500" : "text-muted-foreground")} />
                  <span className={cn("text-sm", agent.emotions ? "" : "text-muted-foreground")}>
                    Emotions {agent.emotions ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Database className={cn("w-4 h-4", agent.memory ? "text-green-500" : "text-muted-foreground")} />
                  <span className={cn("text-sm", agent.memory ? "" : "text-muted-foreground")}>
                    Memory {agent.memory ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {agent.instructions && (
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Instructions</p>
                <p className="text-sm mt-2 whitespace-pre-wrap">{agent.instructions}</p>
              </div>
            )}

            {agent.greetingMsg && (
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Greeting Message</p>
                <p className="text-sm mt-2">{agent.greetingMsg}</p>
              </div>
            )}

            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Created By</p>
              <p className="text-sm mt-1">
                {agent.owner?.owner_name || agent.owner?.owner_email || 'Unknown'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm mt-1">
                  {agent.createdAt ? new Date(agent.createdAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Updated</p>
                <p className="text-sm mt-1">
                  {agent.updatedAt ? new Date(agent.updatedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export default function AgentsAdmin() {
  const [agents, setAgents] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, agent: null })
  const [detailDialog, setDetailDialog] = useState({ open: false, agent: null })
  const [pagination, setPagination] = useState({ skip: 0, take: 20, total: 0 })

  const { listAgents, deleteAgent, loading, error } = useEquos()

  const fetchAgents = async () => {
    setIsLoading(true)
    setPageError(null)
    try {
      const result = await listAgents(pagination.take, pagination.skip)
      setAgents(result.agents || [])
      setPagination(prev => ({ ...prev, total: result.total || 0 }))
    } catch (err) {
      setPageError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [pagination.skip])

  const filteredAgents = agents.filter(agent =>
    (agent.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (agent.provider || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (agent.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleViewDetails = (agent) => {
    setDetailDialog({ open: true, agent })
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

  const providerColors = {
    gemini: 'text-blue-500 bg-blue-500/10',
    openai: 'text-green-500 bg-green-500/10',
    elevenlabs: 'text-purple-500 bg-purple-500/10'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manage Agents</h1>
        <p className="text-muted-foreground">View and manage all EQUOS agents</p>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchAgents} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button asChild>
            <Link to="/agents/create">
              <PlusCircle className="w-4 h-4 mr-2" />
              Create Agent
            </Link>
          </Button>
        </div>
      </div>

      {/* Error state */}
      {(pageError || error) && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{pageError || error}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && agents.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading agents...</p>
          </div>
        </div>
      ) : (
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">All Agents ({pagination.total})</CardTitle>
            <CardDescription>
              Agents are AI configurations that power avatar conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAgents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{searchQuery ? `No agents found matching "${searchQuery}"` : 'No agents created yet'}</p>
                {!searchQuery && (
                  <Button asChild className="mt-4">
                    <Link to="/agents/create">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Create Your First Agent
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Voice</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">
                        {agent.name || 'Unnamed'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs capitalize', providerColors[agent.provider])}
                        >
                          {agent.provider}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {agent.model ? agent.model.split('-').slice(0, 2).join('-') : 'Default'}
                      </TableCell>
                      <TableCell>
                        {agent.voice || 'Default'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {agent.search && (
                            <Globe className="w-4 h-4 text-blue-500" title="Search enabled" />
                          )}
                          {agent.emotions && (
                            <Heart className="w-4 h-4 text-pink-500" title="Emotions enabled" />
                          )}
                          {agent.memory && (
                            <Database className="w-4 h-4 text-purple-500" title="Memory enabled" />
                          )}
                          {!agent.search && !agent.emotions && !agent.memory && (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          <span>{agent.owner?.owner_name || agent.owner?.owner_email || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {agent.createdAt 
                          ? new Date(agent.createdAt).toLocaleDateString() 
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(agent)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(agent)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {pagination.total > pagination.take && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Showing {pagination.skip + 1} - {Math.min(pagination.skip + pagination.take, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.take) }))}
                    disabled={pagination.skip === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.take }))}
                    disabled={pagination.skip + pagination.take >= pagination.total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* View Details Dialog */}
      <AgentDetailDialog
        agent={detailDialog.agent}
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, agent: null })}
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
