import { describe, expect, it } from "vitest"
import {
  DUPLICATE_PRODUCTS_MESSAGE,
  documentLineSchema,
  documentLinesSchema,
  hasDuplicateProducts,
  lineSubtotalCents,
  previewTotals,
} from "./lines"

const line = { product_id: "p1", quantity: 2, unit_price: "45.50" }

describe("documentLineSchema", () => {
  it("acepta una línea válida, incluso con precio cero", () => {
    expect(documentLineSchema.safeParse(line).success).toBe(true)
    expect(documentLineSchema.safeParse({ ...line, unit_price: "0" }).success).toBe(true)
  })

  it("exige producto, cantidad entera positiva y precio decimal", () => {
    expect(documentLineSchema.safeParse({ ...line, product_id: "" }).success).toBe(false)
    for (const quantity of [0, -1, 1.5, Number.NaN]) {
      expect(documentLineSchema.safeParse({ ...line, quantity }).success).toBe(false)
    }
    for (const unit_price of ["", "-1", "1.999", "1,50", "abc"]) {
      expect(documentLineSchema.safeParse({ ...line, unit_price }).success).toBe(false)
    }
  })
})

describe("documentLinesSchema", () => {
  it("exige al menos una línea y sin productos repetidos", () => {
    expect(documentLinesSchema.safeParse([]).success).toBe(false)
    const repeated = documentLinesSchema.safeParse([line, { ...line, quantity: 1 }])
    expect(repeated.success).toBe(false)
    if (!repeated.success) expect(repeated.error.issues[0].message).toBe(DUPLICATE_PRODUCTS_MESSAGE)
  })

  it("las líneas sin producto elegido no cuentan como repetidas", () => {
    expect(hasDuplicateProducts([{ product_id: "" }, { product_id: "" }])).toBe(false)
  })
})

describe("totales", () => {
  it("calcula el subtotal de la línea en centavos", () => {
    expect(lineSubtotalCents(line)).toBe(9100)
    expect(lineSubtotalCents({ quantity: 3, unit_price: "0.10" })).toBe(30) // sin errores de coma flotante
  })

  it("una línea incompleta no tiene subtotal", () => {
    expect(lineSubtotalCents({ quantity: 2, unit_price: "" })).toBeNull()
    expect(lineSubtotalCents({ quantity: Number.NaN, unit_price: "10" })).toBeNull()
  })

  it("suma las líneas válidas y calcula el IGV una sola vez sobre el subtotal", () => {
    const totals = previewTotals([line, { product_id: "p2", quantity: 1, unit_price: "8.90" }, { product_id: "", quantity: 1, unit_price: "" }])
    expect(totals).toEqual({ subtotalCents: 9990, igvCents: 1798, totalCents: 11788 })
  })
})
