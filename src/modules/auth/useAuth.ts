import { useContext } from "react"
import { AuthContext } from "./context"
import { hasPermission } from "./permissions"

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de un AuthProvider")
  }
  return context
}

/** ¿El usuario en sesión tiene este permiso? Úsalo para mostrar u ocultar acciones. */
export function useHasPermission(permission: string): boolean {
  const { user } = useAuth()
  return hasPermission(user, permission)
}