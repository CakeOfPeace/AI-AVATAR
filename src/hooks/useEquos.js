import { useState, useCallback } from 'react'

const API_BASE = '/api/equos'

// Get stored auth token
function getToken() {
  return localStorage.getItem('auth_token')
}

export function useEquos() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const apiRequest = useCallback(async (method, endpoint, body = null) => {
    setLoading(true)
    setError(null)
    
    try {
      const token = getToken()
      
      const headers = {}
      
      // Add auth token if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const options = {
        method,
        headers
      }
      
      // Only set Content-Type and body for methods that have a body
      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        headers['Content-Type'] = 'application/json'
        options.body = JSON.stringify(body)
      }
      
      const response = await fetch(`${API_BASE}${endpoint}`, options)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'API request failed')
      }
      
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // ========================================
  // HEALTH & LIMITS
  // ========================================

  const healthCheck = useCallback(async () => {
    return apiRequest('GET', '/health')
  }, [apiRequest])

  const getLimits = useCallback(async () => {
    return apiRequest('GET', '/limits')
  }, [apiRequest])

  // ========================================
  // AGENTS
  // ========================================

  const listAgents = useCallback(async (take = 20, skip = 0, client = null) => {
    let endpoint = `/agents?take=${take}&skip=${skip}`
    if (client) {
      endpoint += `&client=${encodeURIComponent(client)}`
    }
    return apiRequest('GET', endpoint)
  }, [apiRequest])

  const getAgent = useCallback(async (id) => {
    return apiRequest('GET', `/agents/${id}`)
  }, [apiRequest])

  const createAgent = useCallback(async (agentData) => {
    return apiRequest('POST', '/agents', agentData)
  }, [apiRequest])

  const updateAgent = useCallback(async (id, agentData) => {
    return apiRequest('PUT', `/agents/${id}`, agentData)
  }, [apiRequest])

  const deleteAgent = useCallback(async (id) => {
    return apiRequest('DELETE', `/agents/${id}`)
  }, [apiRequest])

  // ========================================
  // AVATARS
  // ========================================

  const listAvatars = useCallback(async (take = 20, skip = 0, client = null) => {
    let endpoint = `/avatars?take=${take}&skip=${skip}`
    if (client) {
      endpoint += `&client=${encodeURIComponent(client)}`
    }
    return apiRequest('GET', endpoint)
  }, [apiRequest])

  const getAvatar = useCallback(async (id) => {
    return apiRequest('GET', `/avatars/${id}`)
  }, [apiRequest])

  const createAvatar = useCallback(async (avatarData) => {
    return apiRequest('POST', '/avatars', avatarData)
  }, [apiRequest])

  const updateAvatar = useCallback(async (id, avatarData) => {
    return apiRequest('PUT', `/avatars/${id}`, avatarData)
  }, [apiRequest])

  const deleteAvatar = useCallback(async (id) => {
    return apiRequest('DELETE', `/avatars/${id}`)
  }, [apiRequest])

  // ========================================
  // SESSIONS
  // ========================================

  const listSessions = useCallback(async (take = 50, skip = 0, filterUser = null, filterAvatar = null, client = null) => {
    let endpoint = `/sessions?take=${take}&skip=${skip}`
    if (filterUser) {
      endpoint += `&filterUser=${encodeURIComponent(filterUser)}`
    }
    if (filterAvatar) {
      endpoint += `&filterAvatar=${encodeURIComponent(filterAvatar)}`
    }
    if (client) {
      endpoint += `&client=${encodeURIComponent(client)}`
    }
    return apiRequest('GET', endpoint)
  }, [apiRequest])

  const getSession = useCallback(async (id, includeTranscript = true) => {
    const query = includeTranscript ? '?includeTranscript=true' : ''
    return apiRequest('GET', `/sessions/${id}${query}`)
  }, [apiRequest])

  const startSession = useCallback(async (sessionData) => {
    return apiRequest('POST', '/sessions', sessionData)
  }, [apiRequest])

  const stopSession = useCallback(async (id) => {
    return apiRequest('PATCH', `/sessions/${id}/stop`)
  }, [apiRequest])

  // ========================================
  // ADMIN: SYNC
  // ========================================

  const syncOwnership = useCallback(async () => {
    return apiRequest('POST', '/sync')
  }, [apiRequest])

  // ========================================
  // COMBINED CREATION (for unified UI)
  // ========================================

  const createCombinedAvatar = useCallback(async (data) => {
    return apiRequest('POST', '/avatars/combined', data)
  }, [apiRequest])

  return {
    loading,
    error,
    // Health & Limits
    healthCheck,
    getLimits,
    // Agents
    listAgents,
    getAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    // Avatars
    listAvatars,
    getAvatar,
    createAvatar,
    updateAvatar,
    deleteAvatar,
    // Sessions
    listSessions,
    getSession,
    startSession,
    stopSession,
    // Admin
    syncOwnership,
    // Combined creation
    createCombinedAvatar
  }
}
