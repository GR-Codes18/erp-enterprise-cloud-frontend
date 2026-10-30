import { describe, expect, it } from "vitest"
import { reasonSchema } from "@/shared/lib/reasonSchema"

describe("reasonSchema", () => {
  it("acepta un motivo válido de más de 5 caracteres", () => {
    const result = reasonSchema.safeParse({
      reason: "Motivo suficientemente largo para la justificación",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reason).toBe("Motivo suficientemente largo para la justificación")
    }
  })

  it("recorta los espacios al inicio y final (trim)", () => {
    const result = reasonSchema.safeParse({
      reason: "   Motivo con espacios   ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reason).toBe("Motivo con espacios")
    }
  })

  it("rechaza motivos con menos de 5 caracteres", () => {
    const result = reasonSchema.safeParse({ reason: "hola" })
    expect(result.success).toBe(false)
  })

  it("rechaza cadenas vacías o solo compuestas por espacios", () => {
    const result = reasonSchema.safeParse({ reason: "    " })
    expect(result.success).toBe(false)
  })

  it("rechaza motivos que superan los 255 caracteres", () => {
    const longText = "a".repeat(256)
    const result = reasonSchema.safeParse({ reason: longText })
    expect(result.success).toBe(false)
  })
})