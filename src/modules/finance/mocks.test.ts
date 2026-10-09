import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "http://localhost/api/v1", enableMocks: false },
}))
// "Hoy" fijo para que los vencimientos de los datos semilla sean predecibles
vi.mock("@/shared/lib/dates", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/shared/lib/dates")>()
  return { ...original, todayInLima: () => "2026-10-08" }
})

const { financeHandlers } = await import("./mocks")
const API = "http://localhost/api/v1/finance"
const id = (prefix: string, n: number) => `00000000-0000-4000-${prefix}-${String(n).padStart(12, "0")}`
const json = (method: string, body: unknown) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})
const collection = (amount: string, extra: object = {}) => ({
  type: "collection",
  document_type: "sales_invoice",
  document_id: id("8042", 3), // F001-00000102, a crédito y sin cobros
  method: "cash",
  amount,
  payment_date: "2026-10-08",
  bank_account_id: "",
  operation_number: "",
  reference: "",
  ...extra,
})

describe("mocks de Finanzas", () => {
  const server = setupServer(...financeHandlers)
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it("las cuentas por cobrar nacen de comprobantes a crédito y marcan las vencidas", async () => {
    const res = await (await fetch(`${API}/receivables?size=50`)).json()
    const codes = res.items.map((row: { invoice_code: string }) => row.invoice_code)
    expect(codes).toEqual(expect.arrayContaining(["F001-00000101", "F001-00000102"]))
    expect(codes).not.toContain("B001-00000201") // al contado
    const overdue = res.items.find((row: { invoice_code: string }) => row.invoice_code === "F001-00000101")
    expect(overdue.status).toBe("overdue")
  })

  it("un cobro no supera el saldo y la transferencia exige cuenta y operación", async () => {
    const tooMuch = await fetch(`${API}/payments`, json("POST", collection("999999.00")))
    expect(tooMuch.status).toBe(422)
    const noBank = await fetch(`${API}/payments`, json("POST", collection("10.00", { method: "transfer" })))
    expect(noBank.status).toBe(422)
  })

  it("un cobro reduce el saldo y su anulación lo restituye", async () => {
    const created = await (await fetch(`${API}/payments`, json("POST", collection("100.00")))).json()
    const balanceOf = async () =>
      (await (await fetch(`${API}/receivables?search=F001-00000102`)).json()).items[0]
    const before = await balanceOf()
    expect(before.paid).toBe("100.00")

    await fetch(`${API}/payments/${created.id}/void`, json("POST", { reason: "Monto mal digitado" }))
    expect((await balanceOf()).paid).toBe("0.00")
  })

  it("una caja solo tiene una sesión abierta y sin caja abierta no hay efectivo", async () => {
    const register = id("8063", 1)
    const again = await fetch(`${API}/cash/sessions`, json("POST", { register_id: register, opening_amount: "100.00" }))
    expect(again.status).toBe(409)

    const session = await (await fetch(`${API}/cash/sessions/${id("8064", 2)}`)).json()
    const badClose = await fetch(
      `${API}/cash/sessions/${session.id}/close`,
      json("POST", { counted_amount: "0.00", note: "" }), // hay diferencia y no se explica
    )
    expect(badClose.status).toBe(422)
    const closed = await (
      await fetch(`${API}/cash/sessions/${session.id}/close`, json("POST", { counted_amount: session.expected_amount, note: "" }))
    ).json()
    expect(closed).toMatchObject({ status: "closed", difference: "0.00" })

    const cash = await fetch(`${API}/payments`, json("POST", collection("10.00")))
    expect(cash.status).toBe(409)
    expect((await cash.json()).code).toBe("CASH_CLOSED")
  })

  it("el estado de cuenta acumula el saldo y respeta el saldo inicial", async () => {
    const res = await fetch(
      `${API}/statements?party_type=customer&party_id=${id("8000", 1)}&date_from=2026-10-01&date_to=2026-10-31`,
    )
    expect(res.status).toBe(200)
    const statement = await res.json()
    expect(statement.opening_balance).not.toBe("0.00") // el comprobante de septiembre queda antes del rango
    const last = statement.lines.at(-1)
    expect(last.balance).toBe(statement.closing_balance)
  })
})
