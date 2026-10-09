import { describe, expect, it } from "vitest"
import { EMPTY_CATEGORY, categoryInputSchema, type CategoryStatus } from "./schema"

describe("categoryInputSchema", () => {
  it("valida una categoría correcta", () => {
    const validCategory = {
      ...EMPTY_CATEGORY,
      name: "Herramientas Manuales",
      status: "active" as const,
    }

    const result = categoryInputSchema.safeParse(validCategory)
    expect(result.success).toBe(true)
  })

  it("rechaza un nombre demasiado corto (menos de 2 caracteres)", () => {
    const invalidCategory = {
      ...EMPTY_CATEGORY,
      name: "A",
    }

    const result = categoryInputSchema.safeParse(invalidCategory)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Ingresa el nombre de la categoría")
    }
  })

  it("rechaza un nombre demasiado largo (más de 80 caracteres)", () => {
    const invalidCategory = {
      ...EMPTY_CATEGORY,
      name: "A".repeat(81),
    }

    const result = categoryInputSchema.safeParse(invalidCategory)
    expect(result.success).toBe(false)
  })

  it("rechaza un estado inválido", () => {
    const invalidCategory = {
      ...EMPTY_CATEGORY,
      name: "Electrónicos",
      status: "pending" as unknown as CategoryStatus,
    }

    const result = categoryInputSchema.safeParse(invalidCategory)
    expect(result.success).toBe(false)
  })
})