import { useState, useCallback, useEffect } from 'react'

const AUTH_KEY = 'avatar_auth_session'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const password = import.meta.env.VITE_APP_PASSWORD

  // Check for existing session on mount
  useEffect(() => {
    const session = localStorage.getItem(AUTH_KEY)
    if (session) {
      try {
        const { timestamp } = JSON.parse(session)
        const isValid = Date.now() - timestamp < SESSION_DURATION
        if (isValid) {
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem(AUTH_KEY)
        }
      } catch {
        localStorage.removeItem(AUTH_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback((inputPassword) => {
    setError(null)
    
    if (!password) {
      // No password set, allow access
      setIsAuthenticated(true)
      return true
    }

    if (inputPassword === password) {
      setIsAuthenticated(true)
      localStorage.setItem(AUTH_KEY, JSON.stringify({ timestamp: Date.now() }))
      return true
    } else {
      setError('Incorrect password')
      return false
    }
  }, [password])

  const logout = useCallback(() => {
    setIsAuthenticated(false)
    localStorage.removeItem(AUTH_KEY)
  }, [])

  return {
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    requiresPassword: Boolean(password),
  }
}

