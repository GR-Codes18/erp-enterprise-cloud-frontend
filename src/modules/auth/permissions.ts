import type { User } from "./types"

/** Comodín que da todos los permisos (rol Administrador) */
export const ALL_PERMISSIONS = "*"

/**
 * ¿El usuario tiene el permiso "<pantalla>:<acción>"? (ej. "inventory.adjustments:approve").
 * Solo sirve para ocultar acciones: quien decide de verdad es el backend.
 */
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false
  return user.permissions.includes(ALL_PERMISSIONS) || user.permissions.includes(permission)
}
