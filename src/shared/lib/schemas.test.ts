import { describe, expect, it } from "vitest"
import { businessDateSchema, notesSchema } from "./schemas"

describe("businessDateSchema", () => {
  const schema = businessDateSchema("Ingresa la fecha")

  it("acepta fechas reales AAAA-MM-DD y rechaza el resto con el mensaje dado", () => {
    expect(schema.safeParse("2026-10-08").success).toBe(true)
    const invalid = schema.safeParse("2026-02-30")
    expect(invalid.success).toBe(false)
    if (!invalid.success) expect(invalid.error.issues[0].message).toBe("Ingresa la fecha")
  })
})

describe("notesSchema", () => {
  it("acepta vacío y recorta espacios; rechaza más de 500 caracteres", () => {
    expect(notesSchema.parse("  nota  ")).toBe("nota")
    expect(notesSchema.parse("")).toBe("")
    expect(notesSchema.safeParse("x".repeat(501)).success).toBe(false)
  })
})
