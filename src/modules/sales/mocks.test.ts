import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "http://localhost/api/v1", enableMocks: false },
}))

const { salesHandlers } = await import("./mocks")
const API = "http://localhost/api/v1/sales"
const id = (prefix: string, n: number) => `00000000-0000-4000-${prefix}-${String(n).padStart(12, "0")}`

const post = (url: string, body: unknown = {}) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

describe("mocks de Ventas: flujo cotización → pedido → comprobante → devolución", () => {
  const server = setupServer(...salesHandlers)
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it("convierte una cotización aceptada en un pedido en borrador, una sola vez", async () => {
    const res = await post(`${API}/quotes/${id("8040", 2)}/convert`)
    expect(res.status).toBe(200)
    const order = await res.json()
    expect(order).toMatchObject({ status: "draft", quote_id: id("8040", 2), quote_number: "COT-000002" })

    const quote = await (await fetch(`${API}/quotes/${id("8040", 2)}`)).json()
    expect(quote.order_id).toBe(order.id)
    expect((await post(`${API}/quotes/${id("8040", 2)}/convert`)).status).toBe(409)
  })

  it("una acción no permitida en el estado actual responde 409 INVALID_TRANSITION", async () => {
    const res = await post(`${API}/quotes/${id("8040", 4)}/accept`) // está en borrador
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe("INVALID_TRANSITION")
  })

  it("rechazar exige motivo", async () => {
    expect((await post(`${API}/quotes/${id("8040", 3)}/reject`, { reason: "" })).status).toBe(422)
    expect((await post(`${API}/quotes/${id("8040", 3)}/reject`, { reason: "Precio fuera de presupuesto" })).status).toBe(200)
  })

  it("confirmar valida límite de crédito y stock con mensajes claros", async () => {
    const overCredit = await post(`${API}/orders/${id("8041", 6)}/confirm`)
    expect(overCredit.status).toBe(409)
    expect((await overCredit.json()).message).toBe("Excede el límite de crédito del cliente.")

    const noStock = await post(`${API}/orders/${id("8041", 8)}/confirm`)
    expect(noStock.status).toBe(409)
    expect((await noStock.json()).message).toContain("Cable Mellizo")
  })

  it("la factura exige RUC; la boleta no", async () => {
    const order = id("8041", 7) // cliente con DNI
    const asInvoice = await post(`${API}/orders/${order}/invoice`, { type: "invoice" })
    expect(asInvoice.status).toBe(422)
    const asReceipt = await post(`${API}/orders/${order}/invoice`, { type: "receipt" })
    expect(asReceipt.status).toBe(200)
    const invoice = await asReceipt.json()
    expect(invoice).toMatchObject({ series: "B001", status: "issued", paid: "0.00" })
    expect((await (await fetch(`${API}/orders/${order}`)).json()).status).toBe("invoiced")
  })

  it("no se anula un comprobante con cobros", async () => {
    const res = await post(`${API}/invoices/${id("8042", 1)}/void`, { reason: "Error de digitación" })
    expect(res.status).toBe(409) // está con pago parcial
  })

  it("una devolución no supera lo vendido menos lo ya devuelto", async () => {
    const tooMuch = await post(`${API}/returns`, {
      invoice_id: id("8042", 2),
      items: [{ product_id: id("8004", 6), quantity: 4 }], // vendidos 4, ya devuelto 1
      reason: "Producto defectuoso",
    })
    expect(tooMuch.status).toBe(422)
    expect((await tooMuch.json()).errors[0].field).toBe("items.0.quantity")

    const ok = await post(`${API}/returns`, {
      invoice_id: id("8042", 2),
      items: [{ product_id: id("8004", 6), quantity: 3 }],
      reason: "Producto defectuoso",
    })
    expect(ok.status).toBe(201)
    const created = await ok.json()
    expect((await post(`${API}/returns/${created.id}/confirm`)).status).toBe(200)

    const invoice = await (await fetch(`${API}/invoices/${id("8042", 2)}`)).json()
    const gloves = invoice.items.find((item: { product_id: string }) => item.product_id === id("8004", 6))
    expect(gloves.returned_quantity).toBe(4)
  })
})
