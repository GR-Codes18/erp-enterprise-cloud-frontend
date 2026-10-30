import { describe, expect, it } from "vitest"
import { EMPTY_BANK_ACCOUNT, bankAccountInputSchema, bankAccountLabel, bankMovementInputSchema } from "./schema"

describe("bankAccountInputSchema", () => {
  const valid = { ...EMPTY_BANK_ACCOUNT, bank: "BCP", number: "193-2045678-0-12" }

  it("acepta una cuenta válida", () => {
    expect(bankAccountInputSchema.safeParse(valid).success).toBe(true)
  })

  it("el número solo lleva dígitos y guiones (6 a 30)", () => {
    expect(bankAccountInputSchema.safeParse({ ...valid, number: "12345" }).success).toBe(false)
    expect(bankAccountInputSchema.safeParse({ ...valid, number: "193 2045678" }).success).toBe(false)
  })

  it("solo soles o dólares", () => {
    expect(bankAccountInputSchema.safeParse({ ...valid, currency: "EUR" }).success).toBe(false)
  })

  it("arma una etiqueta legible", () => {
    expect(bankAccountLabel({ bank: "BCP", number: "193-1", currency: "PEN" })).toBe("BCP 193-1 (PEN)")
  })
})

describe("bankMovementInputSchema", () => {
  const schema = bankMovementInputSchema("2026-10-08")
  const valid = { type: "expense", concept: "Comisión", amount: "15.00", movement_date: "2026-10-08" }

  it("acepta un movimiento manual con concepto", () => {
    expect(schema.safeParse(valid).success).toBe(true)
  })

  it("exige concepto, monto > 0 y fecha no futura", () => {
    expect(schema.safeParse({ ...valid, concept: "" }).success).toBe(false)
    expect(schema.safeParse({ ...valid, amount: "0.00" }).success).toBe(false)
    expect(schema.safeParse({ ...valid, movement_date: "2026-10-09" }).success).toBe(false)
  })
})
