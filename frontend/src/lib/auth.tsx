import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { authApi, type AuthUser } from "./api"
import { queryClient } from "./query"

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, confirmation: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (name: string, email: string, password: string) => Promise<void>
  clearSession: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    authApi.me().then((current) => active && setUser(current)).catch(() => active && setUser(null)).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  useEffect(() => {
    const unauthorized = () => { setUser(null); queryClient.clear() }
    window.addEventListener("auth:unauthorized", unauthorized)
    return () => window.removeEventListener("auth:unauthorized", unauthorized)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login: async (email, password) => { setUser(await authApi.login(email, password)) },
    register: async (name, email, password, confirmation) => {
      setUser(await authApi.register(name, email, password, confirmation))
    },
    logout: async () => {
      await authApi.logout()
      setUser(null)
      queryClient.clear()
    },
    updateProfile: async (name, email, password) => {
      setUser(await authApi.update(name, email, password))
    },
    clearSession: () => {
      setUser(null)
      queryClient.clear()
    },
  }), [loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return value
}
