import { describe, expect, it } from "vitest"
import {
  PURCHASE_ORDER_STATUSES,
  PURCHASE_ORDER_TRANSITIONS,
  canCancelPurchaseOrder,
  canReceive,
  canTransitionPurchaseOrder,
  emptyPurchaseOrder,
  pendingQuantity,
  purchaseOrderInputSchema,
} from "./schema"

const valid = {
  ...emptyPurchaseOrder("2026-10-20"),
  supplier_id: "s1",
  items: [{ product_id: "p1", quantity: 10, unit_price: "30.00" }],
}

describe("purchaseOrderInputSchema", () => {
  it("acepta una orden válida y exige proveedor, fecha y líneas con costo", () => {
    expect(purchaseOrderInputSchema.safeParse(valid).success).toBe(true)
    expect(purchaseOrderInputSchema.safeParse({ ...valid, supplier_id: "" }).success).toBe(false)
    expect(purchaseOrderInputSchema.safeParse({ ...valid, expected_date: "x" }).success).toBe(false)
    expect(
      purchaseOrderInputSchema.safeParse({ ...valid, items: [{ ...valid.items[0], unit_price: "" }] }).success,
    ).toBe(false)
  })
})

describe("PURCHASE_ORDER_TRANSITIONS", () => {
  it("las recepciones avanzan la orden y nunca retrocede", () => {
    expect(canTransitionPurchaseOrder("draft", "issued")).toBe(true)
    expect(canTransitionPurchaseOrder("issued", "partially_received")).toBe(true)
    expect(canTransitionPurchaseOrder("partially_received", "received")).toBe(true)
    expect(canTransitionPurchaseOrder("received", "issued")).toBe(false)
    expect(canTransitionPurchaseOrder("partially_received", "cancelled")).toBe(false)
    for (const status of PURCHASE_ORDER_STATUSES) expect(PURCHASE_ORDER_TRANSITIONS[status]).toBeDefined()
  })

  it("solo se cancela sin recepciones", () => {
    const line = { product_id: "p1", product_name: "X", quantity: 10, unit_price: "1.00" }
    expect(canCancelPurchaseOrder({ status: "issued", items: [{ ...line, received_quantity: 0 }] })).toBe(true)
    expect(canCancelPurchaseOrder({ status: "issued", items: [{ ...line, received_quantity: 2 }] })).toBe(false)
  })
})

describe("recepción pendiente", () => {
  it("calcula lo pendiente y si se puede recibir", () => {
    expect(pendingQuantity({ quantity: 10, received_quantity: 4 })).toBe(6)
    expect(canReceive({ status: "issued" })).toBe(true)
    expect(canReceive({ status: "partially_received" })).toBe(true)
    expect(canReceive({ status: "draft" })).toBe(false)
    expect(canReceive({ status: "received" })).toBe(false)
  })
})
