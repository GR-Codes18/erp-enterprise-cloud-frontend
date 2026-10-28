import { describe, expect, it } from "vitest"
import { PAYMENT_TRANSITIONS, emptyPayment, paymentInputSchema } from "./schema"

const today = "2026-10-08"
const documentId = "00000000-0000-4000-8042-000000000001"
const schema = paymentInputSchema({ balances: { [documentId]: "500.00" }, today })
const valid = {
  ...emptyPayment("collection", "sales_invoice", today),
  applications: [{ document_id: documentId, amount: "150.00" }],
}

const invalidFields = (input: unknown) => {
  const result = schema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path[0])
}

describe("paymentInputSchema", () => {
  it("acepta un cobro en efectivo dentro del saldo", () => {
    expect(schema.safeParse(valid).success).toBe(true)
  })

  it("cada aplicación debe ser > 0 y <= saldo (el saldo exacto se acepta)", () => {
    expect(invalidFields({ ...valid, applications: [{ document_id: documentId, amount: "0" }] })).toEqual(["applications"])
    expect(invalidFields({ ...valid, applications: [{ document_id: documentId, amount: "500.01" }] })).toEqual(["applications"])
    expect(invalidFields({ ...valid, applications: [{ document_id: documentId, amount: "500.00" }] })).toEqual([])
    expect(invalidFields({ ...valid, applications: [{ document_id: documentId, amount: "abc" }] })).toEqual(["applications"])
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
    expect(invalidFields({ ...valid, applications: [] })).toContain("applications")
  })

  it("no permite aplicar un comprobante a un pago de proveedor", () => {
    expect(invalidFields({ ...valid, type: "payment" })).toContain("document_type")
  })

  it("no permite aplicar dos veces al mismo documento", () => {
    const duplicated = {
      ...valid,
      applications: [
        { document_id: documentId, amount: "100.00" },
        { document_id: documentId, amount: "100.00" },
      ],
    }
    expect(invalidFields(duplicated)).toEqual(["applications"])
  })
})

describe("PAYMENT_TRANSITIONS", () => {
  it("separa registro, aprobación y ejecución; anulado es definitivo", () => {
    expect(PAYMENT_TRANSITIONS.registered).toEqual(["approved", "void"])
    expect(PAYMENT_TRANSITIONS.approved).toEqual(["executed", "void"])
    expect(PAYMENT_TRANSITIONS.executed).toEqual(["void"])
    expect(PAYMENT_TRANSITIONS.void).toEqual([])
  })
})
