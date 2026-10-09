import { describe, expect, it } from "vitest"
import { checkRoleRules } from "./mockRules"
import type { Role } from "./schema"

const role = (id: string, name: string, is_system = false): Role => ({
  id,
  name,
  description: "",
  permissions: [],
  is_system,
})

const admin = role("1", "Administrador", true)
const seller = role("2", "Vendedor")
const items = [admin, seller]
const nobodyUsesIt = () => false

describe("checkRoleRules", () => {
  it("permite crear un rol con nombre nuevo", () => {
    const next = role("3", "Cajero")
    expect(checkRoleRules({ action: "create", next, items }, nobodyUsesIt)).toBeUndefined()
  })

  it("rechaza un nombre repetido, sin importar mayúsculas ni espacios", () => {
    const next = role("3", "  VENDEDOR ")
    const error = checkRoleRules({ action: "create", next, items }, nobodyUsesIt)
    expect(error).toMatchObject({ status: 409, code: "DUPLICATE" })
    expect(error?.errors?.[0]?.field).toBe("name")
  })

  it("permite guardar un rol con su mismo nombre", () => {
    const next = { ...seller, description: "Atiende en tienda" }
    expect(checkRoleRules({ action: "update", current: seller, next, items }, nobodyUsesIt)).toBeUndefined()
  })

  it("no deja editar ni eliminar el rol de sistema", () => {
    const next = { ...admin, name: "Superusuario" }
    expect(checkRoleRules({ action: "update", current: admin, next, items }, nobodyUsesIt)).toMatchObject({
      code: "SYSTEM_ROLE",
    })
    expect(checkRoleRules({ action: "delete", current: admin, items }, nobodyUsesIt)).toMatchObject({
      code: "SYSTEM_ROLE",
    })
  })

  it("no deja convertir un rol en rol de sistema", () => {
    const next = { ...seller, is_system: true }
    expect(checkRoleRules({ action: "update", current: seller, next, items }, nobodyUsesIt)).toMatchObject({
      code: "SYSTEM_ROLE",
    })
  })

  it("no deja eliminar un rol con usuarios asignados", () => {
    const inUse = (id: string) => id === seller.id
    expect(checkRoleRules({ action: "delete", current: seller, items }, inUse)).toMatchObject({
      status: 409,
      code: "IN_USE",
    })
  })

  it("permite eliminar un rol sin usuarios", () => {
    expect(checkRoleRules({ action: "delete", current: seller, items }, nobodyUsesIt)).toBeUndefined()
  })
})
