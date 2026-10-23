import { describe, expect, it, vi } from "vitest"
import { roleSeed } from "./mocks"
import { roleInputSchema } from "./schema"

// El mock arma URLs con la configuración de entorno; aquí no hace falta .env
vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "http://localhost/api/v1", enableMocks: false },
}))

describe("roleSeed", () => {
  it("tiene 12 roles con nombres únicos y un solo rol de sistema", () => {
    expect(roleSeed).toHaveLength(12)
    expect(new Set(roleSeed.map((role) => role.name.toLowerCase())).size).toBe(12)
    expect(roleSeed.filter((role) => role.is_system).map((role) => role.name)).toEqual(["Administrador"])
  })

  it.each(roleSeed)("$name cumple el schema de roles (permisos válidos y con Ver)", (role) => {
    expect(roleInputSchema.safeParse(role).success).toBe(true)
  })

  it("el Administrador tiene todos los permisos del catálogo", () => {
    const admin = roleSeed.find((role) => role.is_system)
    expect(admin?.permissions.length).toBeGreaterThan(roleSeed[1].permissions.length)
  })
})
