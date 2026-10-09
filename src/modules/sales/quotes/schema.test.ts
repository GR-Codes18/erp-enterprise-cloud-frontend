import { describe, expect, it } from "vitest"
import { buildWarehouseOptionsForProduct } from "../pages/QuoteFormPage"
import {
  QUOTE_STATUSES,
  QUOTE_STATUS_LABELS,
  QUOTE_TRANSITIONS,
  canConvertQuote,
  canTransitionQuote,
  emptyQuote,
  quoteInputSchema,
} from "./schema"

const valid = {
  customer_id: "00000000-0000-4000-8000-000000000001",
  issue_date: "2026-10-08",
  valid_until: "2026-10-23",
  items: [{ product_id: "00000000-0000-4000-8004-000000000001", warehouse_id: "00000000-0000-4000-8003-000000000001", quantity: 2, unit_price: "45.50" }],
  notes: "",
}

const invalidFields = (input: unknown) => {
  const result = quoteInputSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path[0])
}

describe("quoteInputSchema", () => {
  it("acepta una cotización válida", () => {
    expect(quoteInputSchema.safeParse(valid).success).toBe(true)
  })

  it("exige cliente, fechas válidas y al menos un producto", () => {
    expect(invalidFields({ ...valid, customer_id: "" })).toContain("customer_id")
    expect(invalidFields({ ...valid, issue_date: "08/10/2026" })).toContain("issue_date")
    expect(invalidFields({ ...valid, items: [] })).toContain("items")
  })

  it("valid_until no puede ser anterior a la emisión (el mismo día sí)", () => {
    expect(invalidFields({ ...valid, valid_until: "2026-10-07" })).toEqual(["valid_until"])
    expect(invalidFields({ ...valid, valid_until: "2026-10-08" })).toEqual([])
  })

  it("la cantidad debe ser mayor que cero y cada línea exige un almacén", () => {
    expect(invalidFields({ ...valid, items: [{ ...valid.items[0], quantity: 0 }] })).toContain("items")
    expect(invalidFields({ ...valid, items: [{ ...valid.items[0], warehouse_id: "" }] })).toContain("items")
  })

  it("una cotización nueva propone 15 días de validez y una línea vacía", () => {
    const quote = emptyQuote("2026-10-28")
    expect(quote.valid_until).toBe("2026-11-12")
    expect(quote.items).toHaveLength(1)
    expect(quote.notes).toBe("")
  })
})

describe("QUOTE_TRANSITIONS", () => {
  it("permite el flujo borrador → enviada → aceptada | rechazada | vencida", () => {
    expect(canTransitionQuote("draft", "sent")).toBe(true)
    expect(canTransitionQuote("sent", "accepted")).toBe(true)
    expect(canTransitionQuote("sent", "rejected")).toBe(true)
    expect(canTransitionQuote("sent", "expired")).toBe(true)
  })

  it("prohíbe saltos y retrocesos", () => {
    expect(canTransitionQuote("draft", "accepted")).toBe(false)
    expect(canTransitionQuote("accepted", "draft")).toBe(false)
    expect(canTransitionQuote("rejected", "sent")).toBe(false)
    expect(canTransitionQuote("expired", "accepted")).toBe(false)
  })

  it("todo estado tiene transiciones definidas y etiqueta en español", () => {
    for (const status of QUOTE_STATUSES) {
      expect(QUOTE_TRANSITIONS[status]).toBeDefined()
      expect(QUOTE_STATUS_LABELS[status]).toBeTruthy()
    }
  })
})

describe("canConvertQuote", () => {
  it("solo una cotización aceptada y sin pedido se convierte", () => {
    expect(canConvertQuote({ status: "accepted", order_id: "" })).toBe(true)
    expect(canConvertQuote({ status: "accepted", order_id: "abc" })).toBe(false)
    expect(canConvertQuote({ status: "sent", order_id: "" })).toBe(false)
  })
})

describe("buildWarehouseOptionsForProduct", () => {
  it("solo incluye almacenes donde el producto tiene stock real", () => {
    const warehouses = [
      { id: "w-central", name: "Almacén Central" },
      { id: "w-south", name: "Almacén Sur" },
      { id: "w-north", name: "Almacén Norte" },
    ]
    const stockRows = [
      { product_id: "prod-7", warehouse_id: "w-central", quantity: 0 },
      { product_id: "prod-7", warehouse_id: "w-south", quantity: 12 },
      { product_id: "prod-7", warehouse_id: "w-north", quantity: 0 },
      { product_id: "prod-9", warehouse_id: "w-central", quantity: 5 },
    ]

    expect(buildWarehouseOptionsForProduct("prod-7", warehouses, stockRows)).toEqual([
      { id: "w-south", name: "Almacén Sur" },
    ])
  })
})
