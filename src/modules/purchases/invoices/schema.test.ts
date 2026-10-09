import { describe, expect, it } from "vitest"
import {
  SUPPLIER_INVOICE_TRANSITIONS,
  canTransitionSupplierInvoice,
  emptySupplierInvoice,
  proposedDueDate,
  supplierInvoiceCode,
  supplierInvoiceInputSchema,
} from "./schema"

const valid = {
  ...emptySupplierInvoice("2026-10-08"),
  supplier_id: "s1",
  order_id: "o1",
  series: "f001",
  number: "123",
  total: "1180.00",
}

const invalidFields = (input: unknown) => {
  const result = supplierInvoiceInputSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path[0])
}

describe("supplierInvoiceInputSchema", () => {
  it("acepta una factura válida y normaliza la serie en mayúsculas", () => {
    expect(supplierInvoiceInputSchema.parse(valid).series).toBe("F001")
  })

  it("valida serie de 4 caracteres, número de hasta 8 dígitos y total decimal", () => {
    expect(invalidFields({ ...valid, series: "F1" })).toContain("series")
    expect(invalidFields({ ...valid, number: "123456789" })).toContain("number")
    expect(invalidFields({ ...valid, total: "1.180,00" })).toContain("total")
    expect(invalidFields({ ...valid, total: "0.00" })).toContain("total")
  })

  it("el vencimiento no puede ser anterior a la emisión", () => {
    expect(invalidFields({ ...valid, due_date: "2026-10-07" })).toEqual(["due_date"])
  })
})

describe("vencimiento propuesto", () => {
  it("suma los días de crédito del proveedor a la emisión", () => {
    expect(proposedDueDate("2026-10-08", 30)).toBe("2026-11-07")
    expect(proposedDueDate("2026-10-08", 0)).toBe("2026-10-08")
  })
})

describe("SUPPLIER_INVOICE_TRANSITIONS", () => {
  it("registrada → pagada | anulada, y nada más", () => {
    expect(canTransitionSupplierInvoice("registered", "paid")).toBe(true)
    expect(canTransitionSupplierInvoice("registered", "void")).toBe(true)
    expect(canTransitionSupplierInvoice("paid", "void")).toBe(false)
    expect(SUPPLIER_INVOICE_TRANSITIONS.void).toEqual([])
  })

  it("arma el código serie-número", () => {
    expect(supplierInvoiceCode({ series: "F001", number: "00000123" })).toBe("F001-00000123")
  })
})
