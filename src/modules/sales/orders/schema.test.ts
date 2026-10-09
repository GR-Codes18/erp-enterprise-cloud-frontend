import { describe, expect, it } from "vitest"
import { EMPTY_ORDER, ORDER_STATUSES, ORDER_TRANSITIONS, canTransitionOrder, orderInputSchema } from "./schema"

const valid = {
  ...EMPTY_ORDER,
  customer_id: "00000000-0000-4000-8000-000000000001",
  items: [{ product_id: "00000000-0000-4000-8004-000000000001", quantity: 2, unit_price: "45.50" }],
}

const invalidFields = (input: unknown) => {
  const result = orderInputSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path[0])
}

describe("orderInputSchema", () => {
  it("acepta un pedido al contado sin cotización de origen", () => {
    expect(orderInputSchema.safeParse(valid).success).toBe(true)
  })

  it("exige cliente y productos", () => {
    expect(invalidFields({ ...valid, customer_id: "" })).toContain("customer_id")
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
