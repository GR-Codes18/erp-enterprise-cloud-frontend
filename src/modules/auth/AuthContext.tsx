import { useCallback, useEffect, useState, type ReactNode } from "react"
import { onUnauthorized, setAccessToken } from "@/shared/lib/api/token"
import { AuthContext } from "./context"
import { authService } from "./service"
import type { LoginCredentials } from "./schema"
import type { User } from "./types"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogoutLocal = useCallback(() => {
    setAccessToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    onUnauthorized(() => {
      handleLogoutLocal()
    })
  }, [handleLogoutLocal])

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true)
    try {
      const response = await authService.login(credentials)
      setAccessToken(response.token)
      setUser(response.user)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } finally {
      handleLogoutLocal()
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