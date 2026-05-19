import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { api, clearSession, setStoredUser, setTokens, getStoredUser } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())

  const login = useCallback(async (email, password) => {
    const data = await api('/api/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setTokens(data.access, data.refresh)
    setStoredUser(data.user)
    setUser(data.user)
    return data.user
  }, [])

  const signup = useCallback(async (payload) => {
    const data = await api('/api/signup/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setTokens(data.access, data.refresh)
    setStoredUser(data.user)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      login,
      signup,
      logout,
    }),
    [user, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
