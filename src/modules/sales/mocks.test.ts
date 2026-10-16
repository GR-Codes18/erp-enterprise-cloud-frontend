import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"
import { getAvailableQuantity, getKardexEntries, resetInventoryState } from "@/modules/inventory/state"
import { productRef, warehouseRef } from "@/modules/inventory/mockRefs"

vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "http://localhost/api/v1", enableMocks: false },
}))

const { salesHandlers } = await import("./mocks")
const API = "http://localhost/api/v1/sales"
const id = (prefix: string, n: number) => `00000000-0000-4000-${prefix}-${String(n).padStart(12, "0")}`

const post = (url: string, body: unknown = {}) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

const createOrder = async ({
  customer,
  product,
  warehouse,
  quantity,
  unitPrice,
  paymentCondition = "cash",
}: {
  customer: number
  product: number
  warehouse: number
  quantity: number
  unitPrice: string
  paymentCondition?: "cash" | "credit"
}) => {
  const response = await post(`${API}/orders`, {
    customer_id: id("8000", customer),
    buyer_name: "",
    buyer_document_type: "",
    buyer_document_number: "",
    sale_type: "unit",
    delivery_method: "none",
    quote_id: "",
    items: [{ product_id: id("8004", product), warehouse_id: id("8003", warehouse), quantity, unit_price: unitPrice }],
    payment_condition: paymentCondition,
    credit_days: paymentCondition === "credit" ? 30 : 0,
    notes: "",
  })
  expect(response.status).toBe(201)
  return response.json()
}

describe("mocks de Ventas: flujo cotización → pedido → comprobante → devolución", () => {
  const server = setupServer(...salesHandlers)
  beforeAll(() => server.listen())
  beforeEach(() => resetInventoryState())
  afterAll(() => server.close())

  it("mantiene las listas de datos semilla reducidas a cinco registros como máximo", async () => {
    for (const resource of ["quotes", "orders", "invoices", "returns"]) {
      const result = await (await fetch(`${API}/${resource}?size=50`)).json()
      expect(result.total, resource).toBeLessThanOrEqual(5)
    }
  })

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
    const creditOrder = await createOrder({
      customer: 3,
      product: 7,
      warehouse: 3,
      quantity: 15,
      unitPrice: "100.00",
      paymentCondition: "credit",
    })
    const overCredit = await post(`${API}/orders/${creditOrder.id}/confirm`)
    expect(overCredit.status).toBe(409)
    expect((await overCredit.json()).message).toBe("Excede el límite de crédito del cliente.")

    const stockOrder = await createOrder({
      customer: 8,
      product: 9,
      warehouse: 1,
      quantity: 20,
      unitPrice: "10.00",
    })
    const noStock = await post(`${API}/orders/${stockOrder.id}/confirm`)
    expect(noStock.status).toBe(409)
    expect((await noStock.json()).message).toContain("Cable Mellizo")
  })

  it("descuenta inventario y registra Kardex al emitir el comprobante, no al confirmar", async () => {
    const productId = productRef(1)
    const warehouseId = warehouseRef(1)
    const initialQuantity = getAvailableQuantity(productId, warehouseId)
    const created = await post(`${API}/orders`, {
      customer_id: id("8000", 1),
      buyer_name: "",
      buyer_document_type: "",
      buyer_document_number: "",
      sale_type: "unit",
      delivery_method: "none",
      quote_id: "",
      items: [{ product_id: productId, warehouse_id: warehouseId, quantity: 2, unit_price: "45.50" }],
      payment_condition: "cash",
      credit_days: 0,
      notes: "",
    })
    expect(created.status).toBe(201)
    const order = await created.json()

    expect((await post(`${API}/orders/${order.id}/confirm`)).status).toBe(200)
    expect(getAvailableQuantity(productId, warehouseId)).toBe(initialQuantity)

    const issued = await post(`${API}/orders/${order.id}/invoice`, { type: "receipt" })
    expect(issued.status).toBe(200)
    expect(getAvailableQuantity(productId, warehouseId)).toBe(initialQuantity - 2)
    expect(getKardexEntries()).toContainEqual(
      expect.objectContaining({
        product_id: productId,
        warehouse_id: warehouseId,
        type: "sale",
        quantity_out: 2,
      }),
    )
  })

  it("anular un comprobante sin cobros repone el stock y deja movimiento de Kardex", async () => {
    const productId = productRef(1)
    const warehouseId = warehouseRef(3)
    const initialQuantity = getAvailableQuantity(productId, warehouseId)
    const order = await createOrder({
      customer: 1,
      product: 1,
      warehouse: 3,
      quantity: 2,
      unitPrice: "45.50",
    })

    expect((await post(`${API}/orders/${order.id}/confirm`)).status).toBe(200)
    const issued = await post(`${API}/orders/${order.id}/invoice`, { type: "receipt" })
    expect(issued.status).toBe(200)
    const invoice = await issued.json()
    expect(getAvailableQuantity(productId, warehouseId)).toBe(initialQuantity - 2)

    const voided = await post(`${API}/invoices/${invoice.id}/void`, { reason: "Venta registrada por error" })
    expect(voided.status).toBe(200)
    expect(getAvailableQuantity(productId, warehouseId)).toBe(initialQuantity)
    expect(getKardexEntries()).toContainEqual(
      expect.objectContaining({
        product_id: productId,
        warehouse_id: warehouseId,
        type: "sale_void",
        reference: `${invoice.series}-${invoice.number}`,
        quantity_in: 2,
      }),
    )
  })

  it("la devolución de venta repone existencias en el almacén de origen", async () => {
    const productId = productRef(1)
    const sourceWarehouseId = warehouseRef(3)
    const otherWarehouseId = warehouseRef(1)
    const sourceBefore = getAvailableQuantity(productId, sourceWarehouseId)
    const otherBefore = getAvailableQuantity(productId, otherWarehouseId)
    const order = await createOrder({
      customer: 2,
      product: 1,
      warehouse: 3,
      quantity: 2,
      unitPrice: "45.50",
    })

    expect((await post(`${API}/orders/${order.id}/confirm`)).status).toBe(200)
    const issued = await post(`${API}/orders/${order.id}/invoice`, { type: "receipt" })
    expect(issued.status).toBe(200)
    const invoice = await issued.json()
    expect(getAvailableQuantity(productId, sourceWarehouseId)).toBe(sourceBefore - 2)

    const createdReturn = await post(`${API}/returns`, {
      invoice_id: invoice.id,
      items: [{ product_id: productId, quantity: 1 }],
      reason: "Producto no requerido",
    })
    expect(createdReturn.status).toBe(201)
    const salesReturn = await createdReturn.json()
    expect((await post(`${API}/returns/${salesReturn.id}/confirm`)).status).toBe(200)

    expect(getAvailableQuantity(productId, sourceWarehouseId)).toBe(sourceBefore - 1)
    expect(getAvailableQuantity(productId, otherWarehouseId)).toBe(otherBefore)
    expect(getKardexEntries()).toContainEqual(
      expect.objectContaining({
        product_id: productId,
        warehouse_id: sourceWarehouseId,
        type: "return",
        reference: salesReturn.number,
        quantity_in: 1,
      }),
    )
  })

  it("emite boleta para comprador ocasional sin crear ficha de cliente", async () => {
    const productId = productRef(1)
    const warehouseId = warehouseRef(1)
    const initialQuantity = getAvailableQuantity(productId, warehouseId)
    const invalid = await post(`${API}/orders`, {
      customer_id: "",
      buyer_name: "",
      buyer_document_type: "",
      buyer_document_number: "",
      sale_type: "unit",
      delivery_method: "none",
      quote_id: "",
      items: [{ product_id: productId, warehouse_id: warehouseId, quantity: 1, unit_price: "45.50" }],
      payment_condition: "cash",
      credit_days: 0,
      notes: "",
    })
    expect(invalid.status).toBe(422)

    const created = await post(`${API}/orders`, {
      customer_id: "",
      buyer_name: "Rosa Pérez",
      buyer_document_type: "DNI",
      buyer_document_number: "12345678",
      sale_type: "unit",
      delivery_method: "none",
      quote_id: "",
      items: [{ product_id: productId, warehouse_id: warehouseId, quantity: 1, unit_price: "45.50" }],
      payment_condition: "cash",
      credit_days: 0,
      notes: "",
    })
    expect(created.status).toBe(201)
    const order = await created.json()
    expect(order).toMatchObject({
      customer_id: "",
      customer_name: "Rosa Pérez",
      buyer_document_type: "DNI",
      buyer_document_number: "12345678",
    })

    expect((await post(`${API}/orders/${order.id}/confirm`)).status).toBe(200)
    const asInvoice = await post(`${API}/orders/${order.id}/invoice`, { type: "invoice" })
    expect(asInvoice.status).toBe(422)
    expect((await asInvoice.json()).code).toBe("GUEST_RECEIPT_REQUIRED")
    expect(getAvailableQuantity(productId, warehouseId)).toBe(initialQuantity)

    const issued = await post(`${API}/orders/${order.id}/invoice`, { type: "receipt" })
    expect(issued.status).toBe(200)
    expect(await issued.json()).toMatchObject({
      type: "receipt",
      customer_id: "",
      customer_name: "Rosa Pérez",
      customer_document: "DNI 12345678",
    })
    expect(getAvailableQuantity(productId, warehouseId)).toBe(initialQuantity - 1)
  })

  it("la factura exige RUC; la boleta no", async () => {
    const created = await post(`${API}/orders`, {
      customer_id: id("8000", 3),
      buyer_name: "",
      buyer_document_type: "",
      buyer_document_number: "",
      sale_type: "unit",
      delivery_method: "none",
      quote_id: "",
      items: [{ product_id: productRef(1), warehouse_id: warehouseRef(1), quantity: 1, unit_price: "45.50" }],
      payment_condition: "cash",
      credit_days: 0,
      notes: "",
    })
    expect(created.status).toBe(201)
    const order = (await created.json()).id
    expect((await post(`${API}/orders/${order}/confirm`)).status).toBe(200)

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

  it("guarda la dirección del perfil en el pedido mayorista y permite avanzar el envío", async () => {
    const createdResponse = await fetch(`${API}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: id("8000", 1),
        buyer_name: "",
        buyer_document_type: "",
        buyer_document_number: "",
        sale_type: "wholesale",
        delivery_method: "shipping",
        quote_id: "",
        items: [{ product_id: id("8004", 1), warehouse_id: id("8003", 1), quantity: 1, unit_price: "45.50" }],
        payment_condition: "cash",
        credit_days: 0,
        notes: "",
      }),
    })
    expect(createdResponse.status).toBe(201)
    const order = await createdResponse.json()
    expect(order).toMatchObject({
      sale_type: "wholesale",
      delivery_method: "shipping",
      delivery_status: "pending",
      delivery_address: "Dirección de prueba 123, Lima",
    })

    expect((await post(`${API}/orders/${order.id}/confirm`)).status).toBe(200)
    const inTransit = await fetch(`${API}/orders/${order.id}/delivery-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_transit" }),
    })
    expect(inTransit.status).toBe(200)
    expect(await inTransit.json()).toMatchObject({ delivery_status: "in_transit" })

    const delivered = await fetch(`${API}/orders/${order.id}/delivery-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "delivered" }),
    })
    expect(delivered.status).toBe(200)
    expect(await delivered.json()).toMatchObject({ status: "confirmed", delivery_status: "delivered" })
  })

  it("no permite enviar un pedido si el perfil del cliente no tiene dirección", async () => {
    const response = await fetch(`${API}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: id("8000", 3),
        buyer_name: "",
        buyer_document_type: "",
        buyer_document_number: "",
        sale_type: "wholesale",
        delivery_method: "shipping",
        quote_id: "",
        items: [{ product_id: id("8004", 1), warehouse_id: id("8003", 1), quantity: 1, unit_price: "45.50" }],
        payment_condition: "cash",
        credit_days: 0,
        notes: "",
      }),
    })
    expect(response.status).toBe(422)
    expect((await response.json()).code).toBe("DELIVERY_ADDRESS_REQUIRED")
  })
})
