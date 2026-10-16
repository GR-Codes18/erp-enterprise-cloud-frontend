import { describe, expect, it } from "vitest"
import {
  EMPTY_ORDER,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  canTransitionOrder,
  getDeliveryStatusLabel,
  getNextDeliveryStatus,
  orderInputSchema,
} from "./schema"

const valid = {
  ...EMPTY_ORDER,
  customer_id: "00000000-0000-4000-8000-000000000001",
  items: [{
    product_id: "00000000-0000-4000-8004-000000000001",
    warehouse_id: "00000000-0000-4000-8003-000000000001",
    quantity: 2,
    unit_price: "45.50",
  }],
}

const invalidFields = (input: unknown) => {
  const result = orderInputSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path[0])
}

describe("orderInputSchema", () => {
  it("acepta un pedido al contado sin cotización de origen", () => {
    expect(orderInputSchema.safeParse(valid).success).toBe(true)
  })

  it("permite comprador ocasional con nombre o documento sin crear cliente", () => {
    expect(orderInputSchema.safeParse({ ...valid, customer_id: "", buyer_name: "Rosa Pérez" }).success).toBe(true)
    expect(
      orderInputSchema.safeParse({
        ...valid,
        customer_id: "",
        buyer_document_type: "DNI",
        buyer_document_number: "12345678",
      }).success,
    ).toBe(true)
    expect(invalidFields({ ...valid, customer_id: "" })).toContain("buyer_name")
    expect(
      invalidFields({ ...valid, customer_id: "", buyer_document_type: "DNI" }),
    ).toContain("buyer_document_number")
  })

  it("requiere cliente registrado para crédito, mayorista o cotización", () => {
    expect(invalidFields({ ...valid, customer_id: "", buyer_name: "Rosa Pérez", payment_condition: "credit", credit_days: 30 })).toContain("customer_id")
    expect(invalidFields({ ...valid, customer_id: "", buyer_name: "Rosa Pérez", sale_type: "wholesale", delivery_method: "pickup" })).toContain("customer_id")
    expect(invalidFields({ ...valid, customer_id: "", buyer_name: "Rosa Pérez", quote_id: "quote-1" })).toContain("customer_id")
  })

  it("valida productos", () => {
    expect(invalidFields({ ...valid, items: [] })).toContain("items")
  })

  it("a crédito exige días de plazo entre 1 y 365", () => {
    expect(invalidFields({ ...valid, payment_condition: "credit", credit_days: 30 })).toEqual([])
    expect(invalidFields({ ...valid, payment_condition: "credit", credit_days: 0 })).toEqual(["credit_days"])
    expect(invalidFields({ ...valid, payment_condition: "credit", credit_days: 366 })).toEqual(["credit_days"])
    expect(invalidFields({ ...valid, payment_condition: "credit", credit_days: 2.5 })).toEqual(["credit_days"])
  })

  it("al contado no lleva días de crédito", () => {
    expect(invalidFields({ ...valid, payment_condition: "cash", credit_days: 15 })).toEqual(["credit_days"])
  })

  it("exige que las ventas al por mayor indiquen envío o recojo", () => {
    expect(invalidFields({ ...valid, sale_type: "wholesale", delivery_method: "none" })).toContain("delivery_method")
    expect(orderInputSchema.safeParse({ ...valid, sale_type: "wholesale", delivery_method: "shipping" }).success).toBe(true)
    expect(orderInputSchema.safeParse({ ...valid, sale_type: "wholesale", delivery_method: "pickup" }).success).toBe(true)
  })

  it("mantiene la venta por unidad presencial", () => {
    expect(invalidFields({ ...valid, sale_type: "unit", delivery_method: "shipping" })).toContain("delivery_method")
  })
})

describe("estado de entrega", () => {
  it("avanza envío y recojo con sus propias etiquetas", () => {
    expect(getNextDeliveryStatus("shipping", "pending")).toBe("in_transit")
    expect(getDeliveryStatusLabel("shipping", "in_transit")).toBe("En camino")
    expect(getNextDeliveryStatus("pickup", "pending")).toBe("ready_for_pickup")
    expect(getDeliveryStatusLabel("pickup", "ready_for_pickup")).toBe("Listo para recojo")
  })

  it("no permite avanzar un estado final o presencial", () => {
    expect(getNextDeliveryStatus("shipping", "delivered")).toBeNull()
    expect(getNextDeliveryStatus("none", "not_required")).toBeNull()
  })
})

describe("ORDER_TRANSITIONS", () => {
  it("permite confirmar, facturar y cancelar antes de facturar", () => {
    expect(canTransitionOrder("draft", "confirmed")).toBe(true)
    expect(canTransitionOrder("confirmed", "invoiced")).toBe(true)
    expect(canTransitionOrder("draft", "cancelled")).toBe(true)
    expect(canTransitionOrder("confirmed", "cancelled")).toBe(true)
  })

  it("un pedido facturado o cancelado ya no cambia", () => {
    expect(canTransitionOrder("invoiced", "cancelled")).toBe(false)
    expect(canTransitionOrder("cancelled", "confirmed")).toBe(false)
    expect(canTransitionOrder("draft", "invoiced")).toBe(false)
  })

  it("todo estado tiene transiciones definidas", () => {
    for (const status of ORDER_STATUSES) expect(ORDER_TRANSITIONS[status]).toBeDefined()
  })
})
