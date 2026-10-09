import { describe, expect, it } from "vitest"
import { PAYMENT_TRANSITIONS, emptyPayment, paymentInputSchema } from "./schema"

const today = "2026-10-08"
const schema = paymentInputSchema({ balance: "500.00", today })
const valid = {
  ...emptyPayment("collection", "sales_invoice", "00000000-0000-4000-8042-000000000001", today),
  amount: "150.00",
}

const invalidFields = (input: unknown) => {
  const result = schema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path[0])
}

describe("paymentInputSchema", () => {
  it("acepta un cobro en efectivo dentro del saldo", () => {
    expect(schema.safeParse(valid).success).toBe(true)
  })

  it("el monto es > 0 y <= saldo (el saldo exacto se acepta)", () => {
    expect(invalidFields({ ...valid, amount: "0" })).toEqual(["amount"])
    expect(invalidFields({ ...valid, amount: "500.01" })).toEqual(["amount"])
    expect(invalidFields({ ...valid, amount: "500.00" })).toEqual([])
    expect(invalidFields({ ...valid, amount: "abc" })).toEqual(["amount"])
  })

  it("la fecha no puede ser futura (hoy sí)", () => {
    expect(invalidFields({ ...valid, payment_date: "2026-10-09" })).toEqual(["payment_date"])
    expect(invalidFields({ ...valid, payment_date: today })).toEqual([])
  })

  it("la transferencia exige cuenta bancaria y número de operación", () => {
    const transfer = { ...valid, method: "transfer" }
    expect(invalidFields(transfer).sort()).toEqual(["bank_account_id", "operation_number"])
    expect(invalidFields({ ...transfer, bank_account_id: "b1", operation_number: "000123" })).toEqual([])
  })

  it("exige el documento", () => {
    expect(invalidFields({ ...valid, document_id: "" })).toContain("document_id")
  })
})

describe("PAYMENT_TRANSITIONS", () => {
  it("un pago vigente solo se anula; anulado es definitivo", () => {
    expect(PAYMENT_TRANSITIONS.active).toEqual(["void"])
    expect(PAYMENT_TRANSITIONS.void).toEqual([])
  })
})
