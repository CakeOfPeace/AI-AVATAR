import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Bot, 
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Phone,
  MoreHorizontal,
  Search,
  ChevronDown,
  ChevronUp,
  Brain,
  RefreshCw,
  Trash2,
  PlusCircle,
  User
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useEquos } from '@/hooks/useEquos'
import { cn } from '@/lib/utils'

export default function AvatarsAdmin() {
  const [search, setSearch] = useState('')
  const [avatars, setAvatars] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  
  const { listAvatars, deleteAvatar, loading, error } = useEquos()

  const fetchAvatars = async () => {
    setIsLoading(true)
    setPageError(null)
    try {
      const result = await listAvatars(100, 0)
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
    (avatar.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (avatar.identity || '').toLowerCase().includes(search.toLowerCase()) ||
    (avatar.client || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async () => {
    if (!selectedAvatar) return
    try {
      await deleteAvatar(selectedAvatar.id)
      await fetchAvatars()
      setDeleteDialogOpen(false)
      setSelectedAvatar(null)
    } catch (err) {
      console.error('Delete error:', err)
      setPageError(`Failed to delete: ${err.message}`)
    }
  }

  // Count avatars with and without agents
  const avatarsWithAgent = avatars.filter(a => a.agentId).length
  const avatarsWithoutAgent = avatars.length - avatarsWithAgent

  if (isLoading && avatars.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading avatars from EQUOS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Avatars</h1>
          <p className="text-muted-foreground">View and manage all EQUOS avatars</p>
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

      {(pageError || error) && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{pageError || error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avatars.length}</p>
                <p className="text-sm text-muted-foreground">Total Avatars</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avatarsWithAgent}</p>
                <p className="text-sm text-muted-foreground">With Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avatarsWithoutAgent}</p>
                <p className="text-sm text-muted-foreground">Without Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and table */}
      <Card className="glass border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All EQUOS Avatars</CardTitle>
              <CardDescription>Manage avatars from EQUOS AI</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search avatars..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Avatar</TableHead>
                <TableHead>Identity</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAvatars.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {avatars.length === 0 ? 'No avatars in EQUOS' : 'No avatars match your search'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAvatars.map((avatar) => {
                  const isExpanded = expandedId === avatar.id
                  const hasAgent = !!avatar.agentId

                  return (
                    <React.Fragment key={avatar.id}>
                      <TableRow 
                        className="cursor-pointer hover:bg-secondary/50"
                        onClick={() => setExpandedId(isExpanded ? null : avatar.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" className="w-6 h-6 flex-shrink-0">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {avatar.refImage ? (
                                <img 
                                  src={avatar.refImage} 
                                  alt={avatar.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Bot className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{avatar.name}</p>
                              <p className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">
                                {avatar.id}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{avatar.identity || '-'}</span>
                        </TableCell>
                        <TableCell>
                          {hasAgent ? (
                            <Badge variant="outline" className="text-green-500 bg-green-500/10 gap-1">
                              <Brain className="w-3 h-3" />
                              Linked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground gap-1">
                              <XCircle className="w-3 h-3" />
                              None
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {avatar.client || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {avatar.createdAt ? new Date(avatar.createdAt).toLocaleDateString() : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                            {hasAgent && (
                              <Button size="sm" variant="outline" asChild>
                                <Link to={`/call/${avatar.id}`}>
                                  <Phone className="w-4 h-4 mr-1" />
                                  Call
                                </Link>
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setSelectedAvatar(avatar)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Avatar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded details */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-secondary/30 p-0">
                            <div className="p-4 space-y-4">
                              <h4 className="font-medium text-sm">Avatar Details</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="p-3 rounded-lg bg-background/50">
                                  <p className="text-xs text-muted-foreground">Avatar ID</p>
                                  <p className="text-sm font-mono break-all">{avatar.id}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-background/50">
                                  <p className="text-xs text-muted-foreground">Organization ID</p>
                                  <p className="text-sm font-mono break-all">{avatar.organizationId || '-'}</p>
                                </div>
                                {avatar.agentId && (
                                  <div className="p-3 rounded-lg bg-background/50">
                                    <p className="text-xs text-muted-foreground">Linked Agent ID</p>
                                    <p className="text-sm font-mono break-all">{avatar.agentId}</p>
                                  </div>
                                )}
                                {avatar.agent && (
                                  <div className="p-3 rounded-lg bg-background/50">
                                    <p className="text-xs text-muted-foreground">Agent Name</p>
                                    <p className="text-sm">{avatar.agent.name || 'Unnamed'}</p>
                                  </div>
                                )}
                              </div>

                              {/* Reference Image */}
                              {avatar.refImage && (
                                <div className="p-3 rounded-lg bg-background/50">
                                  <p className="text-xs text-muted-foreground mb-2">Reference Image</p>
                                  <img 
                                    src={avatar.refImage} 
                                    alt={avatar.name}
                                    className="max-w-xs max-h-64 rounded-lg border border-border object-contain"
                                  />
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Avatar</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedAvatar?.name}"? This will permanently remove it from EQUOS AI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
