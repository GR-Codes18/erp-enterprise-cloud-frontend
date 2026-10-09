import { describe, expect, it } from "vitest"
import { ACCOUNT_STATUSES, ACCOUNT_STATUS_LABELS, ACCOUNT_STATUS_TONES, canRegisterPayment, receivableSchema } from "./schema"

describe("cuentas por cobrar y pagar", () => {
  it("solo admiten cobros o pagos mientras quede saldo", () => {
    expect(canRegisterPayment({ status: "pending" })).toBe(true)
    expect(canRegisterPayment({ status: "overdue" })).toBe(true)
    expect(canRegisterPayment({ status: "paid" })).toBe(false)
  })

  it("todo estado tiene texto y tono; vencida se dice con texto", () => {
    for (const status of ACCOUNT_STATUSES) {
      expect(ACCOUNT_STATUS_LABELS[status]).toBeTruthy()
      expect(ACCOUNT_STATUS_TONES[status]).toBeTruthy()
    }
    expect(ACCOUNT_STATUS_LABELS.overdue).toBe("Vencida")
  })

  it("el schema exige montos como texto", () => {
    const row = {
      id: "a1",
      invoice_id: "i1",
      invoice_code: "F001-00000101",
      issue_date: "2026-09-23",
      due_date: "2026-10-03",
      total: "1218.94",
      paid: "300.00",
      balance: "918.94",
      status: "overdue",
      customer_id: "c1",
      customer_name: "Comercial Andina S.A.C.",
    }
    expect(receivableSchema.safeParse(row).success).toBe(true)
    expect(receivableSchema.safeParse({ ...row, balance: 918.94 }).success).toBe(false)
  })
})
