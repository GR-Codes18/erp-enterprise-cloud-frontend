import { describe, expect, it } from "vitest"
import { RECEPTION_TRANSITIONS, canTransitionReception, receptionInputSchema, receptionQuantityErrors } from "./schema"

const valid = {
  order_id: "o1",
  warehouse_id: "w1",
  guide_number: "T001-000123",
  items: [{ product_id: "p1", quantity: 5 }],
}

describe("receptionInputSchema", () => {
  it("acepta una recepción válida y exige orden, almacén, guía y líneas", () => {
    expect(receptionInputSchema.safeParse(valid).success).toBe(true)
    for (const field of ["order_id", "warehouse_id", "guide_number"]) {
      expect(receptionInputSchema.safeParse({ ...valid, [field]: "" }).success).toBe(false)
    }
    expect(receptionInputSchema.safeParse({ ...valid, items: [] }).success).toBe(false)
  })
})

describe("receptionQuantityErrors", () => {
  it("lo recibido no supera lo pendiente de la orden", () => {
    const orderLines = [{ product_id: "p1", quantity: 10, received_quantity: 6 }]
    expect(receptionQuantityErrors([{ product_id: "p1", quantity: 4 }], orderLines)).toEqual([undefined])
    expect(receptionQuantityErrors([{ product_id: "p1", quantity: 5 }], orderLines)).toEqual([
      "Solo quedan 4 unidades pendientes",
    ])
    expect(receptionQuantityErrors([{ product_id: "p9", quantity: 1 }], orderLines)).toEqual([
      "El producto no está en la orden",
    ])
  })
})

describe("RECEPTION_TRANSITIONS", () => {
  it("confirmada es inmutable", () => {
    expect(canTransitionReception("draft", "confirmed")).toBe(true)
    expect(RECEPTION_TRANSITIONS.confirmed).toEqual([])
  })
})
