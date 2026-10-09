import { describe, expect, it } from "vitest"
import {
  RETURN_STATUSES,
  RETURN_TRANSITIONS,
  canTransitionReturn,
  returnInputSchema,
  returnQuantityErrors,
  returnableQuantity,
} from "./schema"

const valid = {
  invoice_id: "00000000-0000-4000-8042-000000000001",
  items: [{ product_id: "p1", quantity: 2 }],
  reason: "Producto llegó dañado",
}

const invalidFields = (input: unknown) => {
  const result = returnInputSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path[0])
}

describe("returnInputSchema", () => {
  it("acepta una devolución válida y recorta el motivo", () => {
    expect(returnInputSchema.parse({ ...valid, reason: "  Producto dañado  " }).reason).toBe("Producto dañado")
  })

  it("el motivo es obligatorio (5 a 255 caracteres)", () => {
    expect(invalidFields({ ...valid, reason: "" })).toContain("reason")
    expect(invalidFields({ ...valid, reason: "mal" })).toContain("reason")
    expect(invalidFields({ ...valid, reason: "x".repeat(256) })).toContain("reason")
  })

  it("exige comprobante, al menos una línea y cantidades enteras positivas sin repetir producto", () => {
    expect(invalidFields({ ...valid, invoice_id: "" })).toContain("invoice_id")
    expect(invalidFields({ ...valid, items: [] })).toContain("items")
    expect(invalidFields({ ...valid, items: [{ product_id: "p1", quantity: 0 }] })).toContain("items")
    expect(invalidFields({ ...valid, items: [valid.items[0], valid.items[0]] })).toContain("items")
  })
})

describe("cantidades devolvibles", () => {
  const invoiceLines = [
    { product_id: "p1", quantity: 10, returned_quantity: 3 },
    { product_id: "p2", quantity: 5, returned_quantity: 5 },
  ]

  it("lo devolvible es lo vendido menos lo ya devuelto", () => {
    expect(returnableQuantity(invoiceLines[0])).toBe(7)
    expect(returnableQuantity(invoiceLines[1])).toBe(0)
  })

  it("marca solo las líneas que superan lo devolvible", () => {
    expect(
      returnQuantityErrors(
        [
          { product_id: "p1", quantity: 7 },
          { product_id: "p2", quantity: 1 },
          { product_id: "p3", quantity: 1 },
        ],
        invoiceLines,
      ),
    ).toEqual([undefined, "Solo se pueden devolver 0 unidades", "El producto no está en el comprobante"])
  })
})

describe("RETURN_TRANSITIONS", () => {
  it("solo se confirma un borrador, y confirmada es definitiva", () => {
    expect(canTransitionReturn("draft", "confirmed")).toBe(true)
    expect(canTransitionReturn("confirmed", "draft")).toBe(false)
    for (const status of RETURN_STATUSES) expect(RETURN_TRANSITIONS[status]).toBeDefined()
  })
})
