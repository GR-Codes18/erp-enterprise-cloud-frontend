import { describe, expect, it } from "vitest"
import { EMPTY_ROLE, roleInputSchema } from "./schema"

const valid = {
  name: "Vendedor",
  description: "Cotiza y registra pedidos",
  permissions: ["sales.quotes:create", "sales.quotes:view"],
}

const invalidFields = (input: unknown) => {
  const result = roleInputSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path[0])
}

describe("roleInputSchema", () => {
  it("acepta datos válidos", () => {
    expect(roleInputSchema.safeParse(valid).success).toBe(true)
  })

  it("quita espacios sobrantes del nombre y la descripción", () => {
    const parsed = roleInputSchema.parse({ ...valid, name: "  Vendedor  ", description: "  Ventas  " })
    expect(parsed.name).toBe("Vendedor")
    expect(parsed.description).toBe("Ventas")
  })

  it("rechaza un nombre vacío, demasiado corto o demasiado largo", () => {
    expect(invalidFields({ ...valid, name: "" })).toContain("name")
    expect(invalidFields({ ...valid, name: " A " })).toContain("name")
    expect(invalidFields({ ...valid, name: "x".repeat(81) })).toContain("name")
  })

  it("acepta una descripción vacía y rechaza una de más de 200 caracteres", () => {
    expect(roleInputSchema.safeParse({ ...valid, description: "" }).success).toBe(true)
    expect(invalidFields({ ...valid, description: "x".repeat(201) })).toContain("description")
  })

  it("acepta un rol sin permisos", () => {
    expect(roleInputSchema.safeParse({ ...valid, permissions: [] }).success).toBe(true)
  })

  it("rechaza permisos con formato inválido", () => {
    expect(invalidFields({ ...valid, permissions: ["sales.quotes:delete"] })).toContain("permissions")
    expect(invalidFields({ ...valid, permissions: ["ventas"] })).toContain("permissions")
    expect(invalidFields({ ...valid, permissions: ["*"] })).toContain("permissions")
  })

  it('rechaza una pantalla con acciones pero sin "Ver"', () => {
    expect(invalidFields({ ...valid, permissions: ["sales.quotes:edit"] })).toContain("permissions")
    expect(
      invalidFields({ ...valid, permissions: ["sales.quotes:view", "sales.orders:approve"] }),
    ).toContain("permissions")
  })
})

describe("EMPTY_ROLE", () => {
  it("un rol nuevo parte sin permisos", () => {
    expect(EMPTY_ROLE.permissions).toEqual([])
  })

  it("con nombre vacío no pasa la validación", () => {
    expect(invalidFields(EMPTY_ROLE)).toEqual(["name"])
  })
})
