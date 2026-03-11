import { useState, useCallback } from 'react'

const API_BASE = '/api'

// Get stored auth token
function getToken() {
  return localStorage.getItem('auth_token')
}

// Set auth token
function setToken(token) {
  if (token) {
    localStorage.setItem('auth_token', token)
  } else {
    localStorage.removeItem('auth_token')
  }
}

// Get stored user
function getUser() {
  const userStr = localStorage.getItem('auth_user')
  if (userStr) {
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  }
  return null
}

// Set stored user
function setUser(user) {
  if (user) {
    localStorage.setItem('auth_user', JSON.stringify(user))
  } else {
    localStorage.removeItem('auth_user')
  }
}

// API request helper
async function apiRequest(endpoint, options = {}) {
  const token = getToken()
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }
  
  return data
}

// Auth API
export function useAuth() {
  const [user, setUserState] = useState(getUser)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      setToken(data.token)
      setUser(data.user)
      setUserState(data.user)
      return data.user
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (email, password, name) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name })
      })
      setToken(data.token)
      setUser(data.user)
      setUserState(data.user)
      return data.user
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    setUserState(null)
  }, [])

  const checkAuth = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUserState(null)
      return null
    }
    
    try {
      const data = await apiRequest('/auth/me')
      setUser(data.user)
      setUserState(data.user)
      return data.user
    } catch {
      setToken(null)
      setUser(null)
      setUserState(null)
      return null
    }
  }, [])

  const updateProfile = useCallback(async ({ name, email }) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, email })
      })
      setUser(data.user)
      setUserState(data.user)
      return data.user
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      })
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    checkAuth,
    updateProfile,
    updatePassword,
    clearError,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  }
}

// Avatars API
export function useAvatars() {
  const [avatars, setAvatars] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAvatars = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest('/avatars')
      setAvatars(data.avatars)
      return data.avatars
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createAvatar = useCallback(async (name, config) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest('/avatars', {
        method: 'POST',
        body: JSON.stringify({ name, config })
      })
      setAvatars(prev => [data.avatar, ...prev])
      return data.avatar
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getAvatar = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest(`/avatars/${id}`)
      return data.avatar
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateAvatar = useCallback(async (id, updates) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest(`/avatars/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })
      setAvatars(prev => prev.map(a => a.id === id ? data.avatar : a))
      return data.avatar
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteAvatar = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      await apiRequest(`/avatars/${id}`, { method: 'DELETE' })
      setAvatars(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const submitChangeRequest = useCallback(async (avatarId, requestedChanges) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest(`/avatars/${avatarId}/change-request`, {
        method: 'POST',
        body: JSON.stringify({ requestedChanges })
      })
      return data.changeRequest
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getChangeRequests = useCallback(async (avatarId) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest(`/avatars/${avatarId}/change-requests`)
      return data.changeRequests
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const startSession = useCallback(async (avatarId, callType = 'equos') => {
    try {
      const data = await apiRequest(`/avatars/${avatarId}/session/start`, {
        method: 'POST',
        body: JSON.stringify({ callType })
      })
      return data.session
    } catch (err) {
      console.error('Failed to log session start:', err)
      return null
    }
  }, [])

  const endSession = useCallback(async (sessionId) => {
    try {
      const data = await apiRequest(`/avatars/session/${sessionId}/end`, {
        method: 'POST'
      })
      return data.session
    } catch (err) {
      console.error('Failed to log session end:', err)
      return null
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    avatars,
    loading,
    error,
    fetchAvatars,
    createAvatar,
    getAvatar,
    updateAvatar,
    deleteAvatar,
    submitChangeRequest,
    getChangeRequests,
    startSession,
    endSession,
    clearError
  }
}

// Admin API
export function useAdmin() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [allAvatars, setAllAvatars] = useState([])
  const [changeRequests, setChangeRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest('/admin/stats')
      setStats(data.stats)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest('/admin/users')
      setUsers(data.users)
      return data.users
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateUserRole = useCallback(async (userId, role) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role })
      })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: data.user.role } : u))
      return data.user
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteUser = useCallback(async (userId) => {
    setLoading(true)
    setError(null)
    try {
      await apiRequest(`/admin/users/${userId}`, { method: 'DELETE' })
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const resetUserPassword = useCallback(async (userId) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest(`/admin/users/${userId}/reset-password`, { method: 'POST' })
      // Update the user in the list with the new password
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plain_password: data.newPassword } : u))
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAllAvatars = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest('/admin/avatars')
      setAllAvatars(data.avatars)
      return data.avatars
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const adminUpdateAvatar = useCallback(async (id, updates) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest(`/admin/avatars/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })
      setAllAvatars(prev => prev.map(a => a.id === id ? data.avatar : a))
      return data.avatar
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const adminDeleteAvatar = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      await apiRequest(`/admin/avatars/${id}`, { method: 'DELETE' })
      setAllAvatars(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const activateAvatar = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest(`/admin/avatars/${id}/activate`, {
        method: 'POST'
      })
      // Update the avatar in local state - status is now 'processing'
      setAllAvatars(prev => prev.map(a => 
        a.id === id ? { ...a, status: 'processing', conversation_id: data.taskId } : a
      ))
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const checkAvatarStatus = useCallback(async (taskId) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest(`/admin/avatars/status/${taskId}`)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchChangeRequests = useCallback(async (status) => {
    setLoading(true)
    setError(null)
    try {
      const url = status ? `/admin/change-requests?status=${status}` : '/admin/change-requests'
      const data = await apiRequest(url)
      setChangeRequests(data.changeRequests)
      return data.changeRequests
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateChangeRequest = useCallback(async (id, status, adminNotes) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest(`/admin/change-requests/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, adminNotes })
      })
      setChangeRequests(prev => prev.map(r => r.id === id ? data.changeRequest : r))
      return data.changeRequest
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    stats,
    users,
    avatars: allAvatars,  // Alias for component compatibility
    allAvatars,
    changeRequests,
    loading,
    error,
    fetchStats,
    fetchUsers,
    updateUserRole,
    deleteUser,
    resetUserPassword,
    fetchAvatars: fetchAllAvatars,  // Alias for component compatibility
    fetchAllAvatars,
    adminUpdateAvatar,
    deleteAvatar: adminDeleteAvatar,  // Alias for component compatibility
    adminDeleteAvatar,
    activateAvatar,
    checkAvatarStatus,
    fetchChangeRequests,
    updateChangeRequest,
    clearError
  }
}

export { apiRequest, getToken, setToken, getUser, setUser }
