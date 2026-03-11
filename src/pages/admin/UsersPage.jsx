import { useEffect, useState } from 'react'
import { 
  Users, 
  Shield, 
  ShieldCheck,
  Trash2, 
  MoreVertical,
  Search,
  Bot,
  Brain,
  Loader2,
  AlertCircle,
  Calendar,
  Eye,
  EyeOff,
  Key,
  Copy,
  Check,
  Clock,
  Phone,
  Crown,
  Sparkles,
  Building2,
  Gem,
  ChevronDown
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdmin, useAuth } from '@/hooks/useApi'
import { cn } from '@/lib/utils'

// Account tier configuration
const ACCOUNT_TIERS = {
  free: {
    label: 'Free',
    icon: Users,
    color: 'text-muted-foreground bg-secondary',
    description: 'Basic access, no API'
  },
  starter: {
    label: 'Starter',
    icon: Sparkles,
    color: 'text-blue-500 bg-blue-500/10',
    description: 'API access included'
  },
  business: {
    label: 'Business',
    icon: Building2,
    color: 'text-purple-500 bg-purple-500/10',
    description: 'Full platform access'
  },
  custom: {
    label: 'Custom',
    icon: Gem,
    color: 'text-amber-500 bg-amber-500/10',
    description: 'Custom limits & features'
  },
  admin: {
    label: 'Admin',
    icon: Crown,
    color: 'text-primary bg-primary/10',
    description: 'Platform administrator'
  }
}

function TierBadge({ role }) {
  const tier = ACCOUNT_TIERS[role] || ACCOUNT_TIERS.free
  const Icon = tier.icon

  return (
    <Badge variant="outline" className={cn("gap-1", tier.color)}>
      <Icon className="w-3 h-3" />
      {tier.label}
    </Badge>
  )
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null })
  const [roleDialog, setRoleDialog] = useState({ open: false, user: null, newRole: null })
  const [visiblePasswords, setVisiblePasswords] = useState({})
  const [copiedPassword, setCopiedPassword] = useState(null)
  const [resetLoading, setResetLoading] = useState(null)
  
  const { user: currentUser } = useAuth()
  const { 
    users, 
    loading, 
    error, 
    fetchUsers, 
    updateUserRole, 
    deleteUser,
    resetUserPassword 
  } = useAdmin()

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }))
  }

  const copyPassword = (password, userId) => {
    navigator.clipboard.writeText(password)
    setCopiedPassword(userId)
    setTimeout(() => setCopiedPassword(null), 2000)
  }

  const handleResetPassword = async (user) => {
    setResetLoading(user.id)
    try {
      const result = await resetUserPassword(user.id)
      // Make the new password visible
      setVisiblePasswords(prev => ({ ...prev, [user.id]: true }))
    } catch (err) {
      console.error('Failed to reset password:', err)
    } finally {
      setResetLoading(null)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleRoleChange = (user, newRole) => {
    setRoleDialog({ open: true, user, newRole })
  }

  const confirmRoleChange = async () => {
    if (!roleDialog.user || !roleDialog.newRole) return
    
    try {
      await updateUserRole(roleDialog.user.id, roleDialog.newRole)
      setRoleDialog({ open: false, user: null, newRole: null })
    } catch (err) {
      console.error('Failed to update role:', err)
    }
  }

  const handleDelete = (user) => {
    setDeleteDialog({ open: true, user })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.user) return
    
    try {
      await deleteUser(deleteDialog.user.id)
      setDeleteDialog({ open: false, user: null })
    } catch (err) {
      console.error('Failed to delete user:', err)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading users...</p>
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
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Badge variant="outline" className="text-muted-foreground">
          {users.length} users
        </Badge>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tier Legend */}
      <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
        <span className="text-sm font-medium text-muted-foreground mr-2">Account Tiers:</span>
        {Object.entries(ACCOUNT_TIERS).map(([key, tier]) => (
          <div key={key} className="flex items-center gap-2">
            <TierBadge role={key} />
            <span className="text-xs text-muted-foreground hidden sm:inline">{tier.description}</span>
          </div>
        ))}
      </div>

      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage platform users and their account tiers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Avatars</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name || 'No name'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {user.plain_password ? (
                        <>
                          <code className="px-2 py-1 rounded bg-secondary text-sm font-mono min-w-[100px]">
                            {visiblePasswords[user.id] ? user.plain_password : '••••••••'}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => togglePasswordVisibility(user.id)}
                          >
                            {visiblePasswords[user.id] ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyPassword(user.plain_password, user.id)}
                          >
                            {copiedPassword === user.id ? (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not available</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <TierBadge role={user.role} />
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        user.source === 'api' 
                          ? "text-cyan-500 bg-cyan-500/10 border-cyan-500/30" 
                          : "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
                      )}
                    >
                      {user.source === 'api' ? '🔌 API' : '🖥️ UI'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Bot className="w-4 h-4" />
                      <span>{user.avatar_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Brain className="w-4 h-4" />
                      <span>{user.agent_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{user.session_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{user.total_minutes || 0}m</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {formatDate(user.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.id !== currentUser?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* Change Tier Submenu */}
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Shield className="w-4 h-4 mr-2" />
                              Change Tier
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                {Object.entries(ACCOUNT_TIERS).map(([key, tier]) => {
                                  const Icon = tier.icon
                                  const isCurrentTier = user.role === key
                                  return (
                                    <DropdownMenuItem
                                      key={key}
                                      onClick={() => !isCurrentTier && handleRoleChange(user, key)}
                                      disabled={isCurrentTier}
                                      className={cn(isCurrentTier && "opacity-50")}
                                    >
                                      <Icon className={cn("w-4 h-4 mr-2", ACCOUNT_TIERS[key].color.split(' ')[0])} />
                                      {tier.label}
                                      {isCurrentTier && <Check className="w-4 h-4 ml-auto" />}
                                    </DropdownMenuItem>
                                  )
                                })}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>

                          <DropdownMenuItem 
                            onClick={() => handleResetPassword(user)}
                            disabled={resetLoading === user.id}
                          >
                            {resetLoading === user.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Key className="w-4 h-4 mr-2" />
                            )}
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(user)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No users found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <AlertDialog 
        open={roleDialog.open} 
        onOpenChange={(open) => !open && setRoleDialog({ open: false, user: null, newRole: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Account Tier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change{' '}
              <strong>{roleDialog.user?.email}</strong>'s tier from{' '}
              <strong>{ACCOUNT_TIERS[roleDialog.user?.role]?.label || roleDialog.user?.role}</strong> to{' '}
              <strong>{ACCOUNT_TIERS[roleDialog.newRole]?.label || roleDialog.newRole}</strong>?
              {roleDialog.newRole === 'free' && (
                <span className="block mt-2 text-amber-500">
                  Note: Free tier users cannot access the API.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, user: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDialog.user?.email}</strong>? 
              This will also delete all their avatars and data. This action cannot be undone.
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
