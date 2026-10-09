import { describe, expect, it } from "vitest"
import { hasPermission } from "./permissions"
import type { User } from "./types"

const user = (permissions: string[]): User => ({
  id: "00000000-0000-4000-8010-000000000002",
  name: "Ana Pérez",
  email: "ana.perez@enterprisecloud.example",
  role: "Almacenero",
  permissions,
})

describe("hasPermission", () => {
  it("sin sesión no hay permisos", () => {
    expect(hasPermission(null, "inventory.adjustments:approve")).toBe(false)
  })

  it("concede solo el permiso exacto", () => {
    const warehouseKeeper = user(["inventory.adjustments:view", "inventory.adjustments:approve"])
    expect(hasPermission(warehouseKeeper, "inventory.adjustments:approve")).toBe(true)
    expect(hasPermission(warehouseKeeper, "inventory.transfers:approve")).toBe(false)
  })

  it('el comodín "*" concede cualquier permiso', () => {
    expect(hasPermission(user(["*"]), "finance.cash:approve")).toBe(true)
  })

  it("un usuario sin permisos no puede nada", () => {
    expect(hasPermission(user([]), "inventory.adjustments:view")).toBe(false)
  })
})
