import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "http://localhost/api/v1", enableMocks: false },
}))

const { purchaseHandlers } = await import("./mocks")
const API = "http://localhost/api/v1/purchases"
const id = (prefix: string, n: number) => `00000000-0000-4000-${prefix}-${String(n).padStart(12, "0")}`
const ADMIN_TOKEN = "Bearer mock-access-token-00000000-0000-4000-8010-000000000001"

const post = (url: string, body: unknown = {}, token = ADMIN_TOKEN) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify(body),
  })

describe("mocks de Compras", () => {
  const server = setupServer(...purchaseHandlers)
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it("nadie aprueba su propia solicitud", async () => {
    const own = await post(`${API}/requests/${id("8050", 3)}/approve`) // la creó el administrador
    expect(own.status).toBe(409)
    expect((await own.json()).code).toBe("SELF_APPROVAL")

    const other = await post(`${API}/requests/${id("8050", 2)}/approve`) // la creó otra persona
    expect(other.status).toBe(200)
    expect((await other.json()).status).toBe("approved")
  })

  it("no se cancela una orden con recepciones", async () => {
    const res = await post(`${API}/orders/${id("8051", 2)}/cancel`, { reason: "Ya no se necesita" })
    expect(res.status).toBe(409)
  })

  it("la recepción no supera lo pendiente y, al confirmarse, completa la orden", async () => {
    const tooMuch = await post(`${API}/receptions`, {
      order_id: id("8051", 2),
      warehouse_id: id("8003", 1),
      guide_number: "EG07-000950",
      items: [{ product_id: id("8004", 6), quantity: 61 }], // pendientes: 100 - 40 = 60
    })
    expect(tooMuch.status).toBe(422)

    const draft = await post(`${API}/receptions`, {
      order_id: id("8051", 2),
      warehouse_id: id("8003", 1),
      guide_number: "EG07-000950",
      items: [{ product_id: id("8004", 6), quantity: 60 }],
    })
    expect(draft.status).toBe(201)
    const reception = await draft.json()
    expect((await post(`${API}/receptions/${reception.id}/confirm`)).status).toBe(200)

    const order = await (await fetch(`${API}/orders/${id("8051", 2)}`)).json()
    expect(order.status).toBe("received")
  })

  it("la factura repetida responde 409 y un total distinto a lo recibido trae aviso", async () => {
    const duplicate = await post(`${API}/invoices`, {
      supplier_id: id("8001", 1),
      order_id: id("8051", 1),
      series: "F001",
      number: "4521",
      issue_date: "2026-10-08",
      due_date: "2026-11-07",
      total: "4248.00",
    })
    expect(duplicate.status).toBe(409)

    const differs = await post(`${API}/invoices`, {
      supplier_id: id("8001", 1),
      order_id: id("8051", 1),
      series: "F001",
      number: "4600",
      issue_date: "2026-10-08",
      due_date: "2026-11-07",
      total: "5000.00",
    })
    expect(differs.status).toBe(201)
    const invoice = await differs.json()
    expect(invoice.warning).toContain("no coincide")
    expect(invoice.number).toBe("00004600")
  })

  it("la devolución al proveedor no supera lo recibido menos lo ya devuelto", async () => {
    const res = await post(`${API}/returns`, {
      reception_id: id("8052", 1),
      items: [{ product_id: id("8004", 4), quantity: 981 }], // recibidos 1000, devueltos 20
      reason: "Ladrillos fuera de medida",
    })
    expect(res.status).toBe(422)
  })
})
