import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser } from '../types/auth'
import { loginRequest, meRequest } from '../services/authService'
import { AuthContext } from './AuthContext'

interface AuthProviderProps {
  children: ReactNode
}

const TOKEN_KEY = 'control-gastos-token'

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY)
  })

  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = Boolean(user && token)

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const data = await meRequest(token)
        setUser(data.user)
      } catch (error) {
        console.error('Error cargando sesión:', error)
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [token])

  const updateSession = (nextUser: AuthUser, nextToken: string) => {
    localStorage.setItem(TOKEN_KEY, nextToken)
    setToken(nextToken)
    setUser(nextUser)
  }

  const login = async (email: string, password: string) => {
    const data = await loginRequest({ email, password })

    updateSession(data.user, data.token)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        updateSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
