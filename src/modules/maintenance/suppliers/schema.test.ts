import { describe, expect, it } from "vitest"
import { EMPTY_SUPPLIER, supplierInputSchema } from "./schema"

describe("supplierInputSchema", () => {
  it("valida un proveedor correcto con RUC y días de crédito", () => {
    const validSupplier = {
      ...EMPTY_SUPPLIER,
      document_type: "RUC" as const,
      document_number: "20123456789",
      name: "Distribuidora del Norte S.A.C.",
      email: "contacto@distribuidora.com",
      phone: "987654321",
      credit_days: 30,
    }

    const result = supplierInputSchema.safeParse(validSupplier)
    expect(result.success).toBe(true)
  })

  it("acepta campos opcionales vacíos (email y phone)", () => {
    const validSupplier = {
      ...EMPTY_SUPPLIER,
      document_type: "DNI" as const,
      document_number: "12345678",
      name: "Juan Pérez Proveedor",
      email: "",
      phone: "",
      credit_days: 0,
    }

    const result = supplierInputSchema.safeParse(validSupplier)
    expect(result.success).toBe(true)
  })

  it("rechaza un RUC inválido", () => {
    const invalidSupplier = {
      ...EMPTY_SUPPLIER,
      document_type: "RUC" as const,
      document_number: "12345", // Menos de 11 dígitos
      name: "Proveedor Inválido",
      credit_days: 15,
    }

    const result = supplierInputSchema.safeParse(invalidSupplier)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("El RUC debe tener 11 dígitos")
    }
  })

  it("rechaza días de crédito negativos o no enteros", () => {
    const invalidNegative = supplierInputSchema.safeParse({
      ...EMPTY_SUPPLIER,
      document_type: "RUC" as const,
      document_number: "20123456789",
      name: "Proveedor X",
      credit_days: -5,
    })

    const invalidDecimal = supplierInputSchema.safeParse({
      ...EMPTY_SUPPLIER,
      document_type: "RUC" as const,
      document_number: "20123456789",
      name: "Proveedor Y",
      credit_days: 10.5,
    })

    expect(invalidNegative.success).toBe(false)
    expect(invalidDecimal.success).toBe(false)
  })

  it("rechaza un nombre demasiado corto", () => {
    const invalidSupplier = {
      ...EMPTY_SUPPLIER,
      document_type: "DNI" as const,
      document_number: "87654321",
      name: "A",
    }

    const result = supplierInputSchema.safeParse(invalidSupplier)
    expect(result.success).toBe(false)
  })
})