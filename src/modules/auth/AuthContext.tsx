import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  onUnauthorized,
  refreshAccessToken,
  setAccessToken,
  setTokenRefresher,
} from "@/shared/lib/api/token"
import { AuthContext } from "./context"
import { authService } from "./service"
import type { LoginCredentials } from "./schema"
import type { User } from "./types"

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  // Al arrancar (o tras F5) se intenta recuperar la sesión con la cookie de refresh
  const [isLoading, setIsLoading] = useState(true)

  // Sin sesión no debe quedar en memoria nada del usuario anterior: token ni datos en caché
  const clearSession = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    onUnauthorized(clearSession)
    setTokenRefresher(async () => {
      try {
        const session = await authService.refresh()
        setAccessToken(session.token)
        setUser(session.user)
        return true
      } catch {
        return false
      }
    })
    void refreshAccessToken().finally(() => setIsLoading(false))
    return () => setTokenRefresher(null)
  }, [clearSession])

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials)
    queryClient.clear()
    setAccessToken(response.token)
    setUser(response.user)
  }

  const logout = async () => {
    try {
      // El backend invalida el refresh token y borra su cookie
      await authService.logout()
    } catch {
      // Aunque falle la llamada, la sesión local se cierra igual
    } finally {
      clearSession()
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
