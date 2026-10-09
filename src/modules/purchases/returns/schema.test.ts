import { describe, expect, it } from "vitest"
import {
  PURCHASE_RETURN_TRANSITIONS,
  canTransitionPurchaseReturn,
  purchaseReturnInputSchema,
  purchaseReturnQuantityErrors,
} from "./schema"

const valid = { reception_id: "r1", items: [{ product_id: "p1", quantity: 2 }], reason: "Mercadería dañada" }

describe("purchaseReturnInputSchema", () => {
  it("acepta una devolución válida y exige motivo de 5 a 255 caracteres", () => {
    expect(purchaseReturnInputSchema.safeParse(valid).success).toBe(true)
    expect(purchaseReturnInputSchema.safeParse({ ...valid, reason: "mal" }).success).toBe(false)
    expect(purchaseReturnInputSchema.safeParse({ ...valid, reception_id: "" }).success).toBe(false)
  })
})

describe("purchaseReturnQuantityErrors", () => {
  it("lo devuelto no supera lo recibido menos lo ya devuelto", () => {
    const lines = [{ product_id: "p1", quantity: 10, returned_quantity: 8 }]
    expect(purchaseReturnQuantityErrors([{ product_id: "p1", quantity: 2 }], lines)).toEqual([undefined])
    expect(purchaseReturnQuantityErrors([{ product_id: "p1", quantity: 3 }], lines)).toEqual([
      "Solo se pueden devolver 2 unidades",
    ])
  })
})

describe("PURCHASE_RETURN_TRANSITIONS", () => {
  it("solo se confirma un borrador", () => {
    expect(canTransitionPurchaseReturn("draft", "confirmed")).toBe(true)
    expect(PURCHASE_RETURN_TRANSITIONS.confirmed).toEqual([])
  })
})
