import type { MockRuleError, MockWrite } from "@/mocks/utils/crud"
import type { Role } from "./schema"

/**
 * Reglas de Roles que en producción decide el backend; aquí las simula el mock:
 * nombre único, el rol de sistema no se toca y un rol con usuarios no se elimina.
 */
export function checkRoleRules(
  { action, current, next, items }: MockWrite<Role>,
  isRoleInUse: (roleId: string) => boolean,
): MockRuleError | undefined {
  if (current?.is_system) {
    return {
      status: 409,
      code: "SYSTEM_ROLE",
      message: `El rol "${current.name}" es de sistema: no se edita ni se elimina.`,
    }
  }

  if (action === "update" && next?.is_system) {
    return { status: 409, code: "SYSTEM_ROLE", message: "Un rol no puede convertirse en rol de sistema." }
  }

  if (next) {
    const name = next.name.trim().toLowerCase()
    if (items.some((role) => role.id !== next.id && role.name.trim().toLowerCase() === name)) {
      const message = "Ya existe un rol con este nombre"
      return { status: 409, code: "DUPLICATE", message, errors: [{ field: "name", message }] }
    }
  }

  if (action === "delete" && current && isRoleInUse(current.id)) {
    return {
      status: 409,
      code: "IN_USE",
      message: "Este rol tiene usuarios asignados y no se puede eliminar. Reasígnalos primero.",
    }
  }

  return undefined
}
