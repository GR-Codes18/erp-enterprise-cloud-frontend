import type { MockRuleError, MockWrite } from "@/mocks/utils/crud"
import type { User } from "./schema"

const isActiveAdmin = (user: User | undefined, adminRoleId: string) =>
  user?.status === "active" && user.role_id === adminRoleId

/**
 * Reglas de Usuarios que en producción decide el backend; aquí las simula el mock:
 * nadie se desactiva a sí mismo, correo único y siempre al menos un administrador activo.
 */
export function checkUserRules(
  { action, current, next, items }: MockWrite<User>,
  adminRoleId: string,
  sessionUserId = "",
): MockRuleError | undefined {
  // Nadie se desactiva a sí mismo (la interfaz tampoco lo ofrece)
  if (action === "update" && current && next && current.id === sessionUserId && current.status === "active" && next.status !== "active") {
    return { status: 409, code: "SELF_DEACTIVATION", message: "No puedes desactivar tu propio usuario." }
  }

  if (next) {
    const email = next.email.trim().toLowerCase()
    const duplicate = items.some(
      (user) => user.id !== next.id && user.email.trim().toLowerCase() === email,
    )
    if (duplicate) {
      const message = "Ya existe un usuario con este correo"
      return { status: 409, code: "DUPLICATE", message, errors: [{ field: "email", message }] }
    }
  }

  // Quitar (desactivar o cambiar de rol) a un administrador activo exige que quede otro
  const losesAdmin =
    action !== "create" && isActiveAdmin(current, adminRoleId) && !isActiveAdmin(next, adminRoleId)
  const otherActiveAdmins = items.filter(
    (user) => user.id !== current?.id && isActiveAdmin(user, adminRoleId),
  )
  if (losesAdmin && otherActiveAdmins.length === 0) {
    return {
      status: 409,
      code: "LAST_ADMIN",
      message: "Debe quedar al menos un administrador activo.",
    }
  }

  return undefined
}
