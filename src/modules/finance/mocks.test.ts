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
const { salesHandlers } = await import("@/modules/sales/mocks")
const { purchaseHandlers } = await import("@/modules/purchases/mocks")
const API = "http://localhost/api/v1/finance"
const SALES_API = "http://localhost/api/v1/sales"
const PURCHASES_API = "http://localhost/api/v1/purchases"
const id = (prefix: string, n: number) => `00000000-0000-4000-${prefix}-${String(n).padStart(12, "0")}`
const json = (method: string, body: unknown) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})
const collection = (
  amount: string,
  extra: { document_id?: string; method?: string; bank_account_id?: string; operation_number?: string } = {},
) => {
  const { document_id = id("8042", 3), ...overrides } = extra
  return {
    type: "collection",
    document_type: "sales_invoice",
    applications: [{ document_id, amount }],
    method: "cash",
    payment_date: "2026-10-08",
    bank_account_id: "",
    operation_number: "",
    reference: "",
    ...overrides,
  }
}

describe("mocks de Finanzas", () => {
  const server = setupServer(...salesHandlers, ...purchaseHandlers, ...financeHandlers)
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

  it("un cobro solo afecta saldo al ejecutarse y al anularse lo restituye", async () => {
    const created = await (await fetch(`${API}/payments`, json("POST", collection("100.00")))).json()
    const balanceOf = async () =>
      (await (await fetch(`${API}/receivables?search=F001-00000102`)).json()).items[0]
    expect((await balanceOf()).paid).toBe("0.00")
    expect((await fetch(`${API}/payments/${created.id}/execute`, json("POST", {}))).status).toBe(409)
    expect((await fetch(`${API}/payments/${created.id}/approve`, json("POST", {}))).status).toBe(200)
    expect((await balanceOf()).paid).toBe("0.00")
    expect((await fetch(`${API}/payments/${created.id}/execute`, json("POST", {}))).status).toBe(200)
    expect((await balanceOf()).paid).toBe("100.00")

    await fetch(`${API}/payments/${created.id}/void`, json("POST", { reason: "Monto mal digitado" }))
    expect((await balanceOf()).paid).toBe("0.00")
  })

  it("sincroniza comprobantes nuevos de ventas y compras con sus cuentas y sus pagos", async () => {
    const orderResponse = await fetch(
      `${SALES_API}/orders`,
      json("POST", {
        customer_id: id("8000", 1),
        buyer_name: "",
        buyer_document_type: "",
        buyer_document_number: "",
        sale_type: "unit",
        delivery_method: "none",
        quote_id: "",
        items: [{ product_id: id("8004", 1), warehouse_id: id("8003", 1), quantity: 1, unit_price: "10.00" }],
        payment_condition: "credit",
        credit_days: 30,
        notes: "",
      }),
    )
    expect(orderResponse.status).toBe(201)
    const order = await orderResponse.json()
    expect((await fetch(`${SALES_API}/orders/${order.id}/confirm`, json("POST", {}))).status).toBe(200)
    const invoiceResponse = await fetch(
      `${SALES_API}/orders/${order.id}/invoice`,
      json("POST", { type: "receipt" }),
    )
    expect(invoiceResponse.status).toBe(200)
    const salesInvoice = await invoiceResponse.json()

    const receivableResponse = await fetch(`${API}/receivables?search=${salesInvoice.series}-${salesInvoice.number}`)
    const receivable = (await receivableResponse.json()).items[0]
    expect(receivable).toMatchObject({
      invoice_id: salesInvoice.id,
      total: salesInvoice.total,
      paid: "0.00",
      balance: salesInvoice.total,
    })

    const collectionResponse = await fetch(
      `${API}/payments`,
      json("POST", {
        type: "collection",
        document_type: "sales_invoice",
        applications: [
          { document_id: id("8042", 1), amount: "100.00" },
          { document_id: salesInvoice.id, amount: salesInvoice.total },
        ],
        method: "transfer",
        payment_date: "2026-10-08",
        bank_account_id: id("8066", 1),
        operation_number: "SALE-001",
        reference: "",
      }),
    )
    expect(collectionResponse.status).toBe(201)
    const collectionPayment = await collectionResponse.json()
    expect((await (await fetch(`${API}/receivables?search=${salesInvoice.series}-${salesInvoice.number}`)).json()).items[0])
      .toMatchObject({ paid: "0.00", balance: salesInvoice.total })
    expect((await (await fetch(`${API}/receivables?search=F001-00000101`)).json()).items[0].paid).toBe("300.00")
    expect((await fetch(`${API}/payments/${collectionPayment.id}/approve`, json("POST", {}))).status).toBe(200)
    expect((await fetch(`${API}/payments/${collectionPayment.id}/execute`, json("POST", {}))).status).toBe(200)
    expect(collectionPayment.applications).toHaveLength(2)
    expect((await (await fetch(`${API}/receivables?search=F001-00000101`)).json()).items[0].paid).toBe("400.00")
    expect((await (await fetch(`${API}/receivables?search=${salesInvoice.series}-${salesInvoice.number}`)).json()).items[0])
      .toMatchObject({ paid: salesInvoice.total, balance: "0.00", status: "paid" })
    expect((await (await fetch(`${SALES_API}/invoices/${salesInvoice.id}`)).json()))
      .toMatchObject({ paid: salesInvoice.total, balance: "0.00", status: "paid" })
    expect((await fetch(`${API}/payments/${collectionPayment.id}/void`, json("POST", { reason: "Pago aplicado por error" }))).status)
      .toBe(200)
    expect((await (await fetch(`${API}/receivables?search=${salesInvoice.series}-${salesInvoice.number}`)).json()).items[0])
      .toMatchObject({ paid: "0.00", balance: salesInvoice.total, status: "pending" })
    expect((await (await fetch(`${SALES_API}/invoices/${salesInvoice.id}`)).json()))
      .toMatchObject({ paid: "0.00", balance: salesInvoice.total, status: "issued" })
    expect((await (await fetch(`${API}/receivables?search=F001-00000101`)).json()).items[0].paid).toBe("300.00")

    const supplierInvoiceResponse = await fetch(
      `${PURCHASES_API}/invoices`,
      json("POST", {
        supplier_id: id("8001", 8),
        order_id: id("8051", 3),
        series: "F009",
        number: "99001234",
        issue_date: "2026-10-08",
        due_date: "2026-11-07",
        total: "1.00",
      }),
    )
    expect(supplierInvoiceResponse.status).toBe(201)
    const supplierInvoice = await supplierInvoiceResponse.json()
    expect((await (await fetch(`${API}/payables?search=F009-99001234`)).json()).items[0])
      .toMatchObject({ invoice_id: supplierInvoice.id, total: "1.00", paid: "0.00", balance: "1.00" })

    const paymentResponse = await fetch(
      `${API}/payments`,
      json("POST", {
        type: "payment",
        document_type: "supplier_invoice",
        applications: [{ document_id: supplierInvoice.id, amount: "1.00" }],
        method: "transfer",
        payment_date: "2026-10-08",
        bank_account_id: id("8066", 1),
        operation_number: "PURCHASE-001",
        reference: "",
      }),
    )
    expect(paymentResponse.status).toBe(201)
    const supplierPayment = await paymentResponse.json()
    expect((await fetch(`${API}/payments/${supplierPayment.id}/approve`, json("POST", {}))).status).toBe(200)
    expect((await fetch(`${API}/payments/${supplierPayment.id}/execute`, json("POST", {}))).status).toBe(200)
    expect((await (await fetch(`${API}/payables?search=F009-99001234`)).json()).items[0])
      .toMatchObject({ paid: "1.00", balance: "0.00", status: "paid" })
    expect((await (await fetch(`${PURCHASES_API}/invoices/${supplierInvoice.id}`)).json()))
      .toMatchObject({ paid: "1.00", balance: "0.00", status: "paid" })
    expect((await fetch(`${API}/payments/${supplierPayment.id}/void`, json("POST", { reason: "Pago aplicado por error" }))).status)
      .toBe(200)
    expect((await (await fetch(`${API}/payables?search=F009-99001234`)).json()).items[0])
      .toMatchObject({ paid: "0.00", balance: "1.00", status: "pending" })
    expect((await (await fetch(`${PURCHASES_API}/invoices/${supplierInvoice.id}`)).json()))
      .toMatchObject({ paid: "0.00", balance: "1.00", status: "registered" })
  }, 15000)

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

    const cash = await (await fetch(`${API}/payments`, json("POST", collection("10.00")))).json()
    expect((await fetch(`${API}/payments/${cash.id}/approve`, json("POST", {}))).status).toBe(200)
    const execution = await fetch(`${API}/payments/${cash.id}/execute`, json("POST", {}))
    expect(execution.status).toBe(409)
    expect((await execution.json()).code).toBe("CASH_CLOSED")
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

  it("los registros mock de instrumentos y tributos permiten alta y cambio de estado", async () => {
    const instrumentResponse = await fetch(
      `${API}/instruments`,
      json("POST", {
        type: "promissory_note",
        number: "PN-TEST-001",
        third_party: "Cliente de prueba",
        amount: "250.00",
        issue_date: "2026-10-01",
        due_date: "2026-11-01",
      }),
    )
    expect(instrumentResponse.status).toBe(201)
    const instrument = await instrumentResponse.json()
    expect(instrument.status).toBe("pending")
    expect((await fetch(`${API}/instruments/${instrument.id}/status`, json("PATCH", { status: "paid" }))).status).toBe(200)

    const taxResponse = await fetch(
      `${API}/taxes`,
      json("POST", {
        tax_type: "IGV",
        period: "2026-10",
        base: "1000.00",
        amount: "180.00",
        document_origin: "REG-TEST-2026-10",
      }),
    )
    expect(taxResponse.status).toBe(201)
    const tax = await taxResponse.json()
    expect((await fetch(`${API}/taxes/${tax.id}/status`, json("PATCH", { status: "paid" }))).status).toBe(200)
    expect((await fetch(`${API}/taxes/${tax.id}/status`, json("PATCH", { status: "paid" }))).status).toBe(409)
  })
})
