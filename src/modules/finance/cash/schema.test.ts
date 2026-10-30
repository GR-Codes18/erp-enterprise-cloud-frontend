import { describe, expect, it } from "vitest"
import { formatCents } from "@/shared/lib/money"
import {
  CASH_SESSION_TRANSITIONS,
  canTransitionCashSession,
  cashDifferenceCents,
  cashMovementInputSchema,
  closeSessionSchema,
  differenceText,
  openSessionSchema,
} from "./schema"

describe("CASH_SESSION_TRANSITIONS", () => {
  it("una sesión abierta se cierra y una cerrada es solo lectura", () => {
    expect(canTransitionCashSession("open", "closed")).toBe(true)
    expect(canTransitionCashSession("closed", "open")).toBe(false)
    expect(CASH_SESSION_TRANSITIONS.closed).toEqual([])
  })
})

describe("openSessionSchema", () => {
  it("exige caja y un monto inicial decimal", () => {
    expect(openSessionSchema.safeParse({ register_id: "r1", opening_amount: "150.00" }).success).toBe(true)
    expect(openSessionSchema.safeParse({ register_id: "", opening_amount: "150.00" }).success).toBe(false)
    expect(openSessionSchema.safeParse({ register_id: "r1", opening_amount: "-5" }).success).toBe(false)
  })
})

describe("cashMovementInputSchema", () => {
  it("el concepto es obligatorio y el monto mayor que cero", () => {
    expect(cashMovementInputSchema.safeParse({ type: "expense", concept: "Movilidad", amount: "25.00" }).success).toBe(true)
    expect(cashMovementInputSchema.safeParse({ type: "expense", concept: "", amount: "25.00" }).success).toBe(false)
    expect(cashMovementInputSchema.safeParse({ type: "income", concept: "Venta", amount: "0" }).success).toBe(false)
  })
})

describe("cierre de caja", () => {
  const schema = closeSessionSchema("425.00")

  it("si cuadra, la nota es opcional", () => {
    expect(schema.safeParse({ counted_amount: "425.00", note: "" }).success).toBe(true)
  })

  it("con diferencia, la nota es obligatoria", () => {
    expect(schema.safeParse({ counted_amount: "423.00", note: "" }).success).toBe(false)
    expect(schema.safeParse({ counted_amount: "423.00", note: "Vuelto mal entregado" }).success).toBe(true)
  })

  it("la diferencia es contado − esperado y se describe sin doble signo", () => {
    expect(cashDifferenceCents("425.00", "423.00")).toBe(-200)
    expect(differenceText(-200, formatCents)).toMatch(/^Faltante S\/\s2\.00$/)
    expect(differenceText(150, formatCents)).toMatch(/^Sobrante S\/\s1\.50$/)
    expect(differenceText(0, formatCents)).toBe("Cuadra")
  })
})
