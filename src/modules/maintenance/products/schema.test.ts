import { describe, expect, it } from "vitest"
import {
  EMPTY_PRODUCT,
  productCreateSchema,
  productUpdateSchema,
} from "./schema"

describe("productCreateSchema", () => {
  it("valida la creación de un producto correcto (sin stock)", () => {
    const validProduct = {
      ...EMPTY_PRODUCT,
      code: "PROD-001",
      name: "Martillo de Peña 16oz",
      category_id: "00000000-0000-4000-8002-000000000001",
      unit_price: 45.5,
      status: "active" as const,
    }

    const result = productCreateSchema.safeParse(validProduct)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code).toBe("PROD-001")
    }
  })

  it("normaliza el código convirtiéndolo a mayúsculas y eliminando espacios", () => {
    const product = {
      ...EMPTY_PRODUCT,
      code: "  prod-002  ",
      name: "Sierra de Mano",
      category_id: "00000000-0000-4000-8002-000000000001",
      unit_price: 25.0,
    }

    const result = productCreateSchema.safeParse(product)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code).toBe("PROD-002")
    }
  })

  it("rechaza un código demasiado corto o con caracteres inválidos", () => {
    const invalidCode = {
      ...EMPTY_PRODUCT,
      code: "A",
      name: "Martillo",
      category_id: "cat-1",
    }
    expect(productCreateSchema.safeParse(invalidCode).success).toBe(false)

    const invalidChar = {
      ...EMPTY_PRODUCT,
      code: "PROD #001",
      name: "Martillo",
      category_id: "cat-1",
    }
    expect(productCreateSchema.safeParse(invalidChar).success).toBe(false)
  })

  it("valida límites de precio (0, 0.1, 0.10 son válidos; negativo y >2 decimales son rechazados)", () => {
    const base = {
      ...EMPTY_PRODUCT,
      code: "PROD-001",
      name: "Martillo",
      category_id: "cat-1",
    }

    expect(productCreateSchema.safeParse({ ...base, unit_price: 0 }).success).toBe(true)
    expect(productCreateSchema.safeParse({ ...base, unit_price: 0.1 }).success).toBe(true)
    expect(productCreateSchema.safeParse({ ...base, unit_price: 0.10 }).success).toBe(true)
    expect(productCreateSchema.safeParse({ ...base, unit_price: 123.45 }).success).toBe(true)

    // Rechaza precio negativo
    expect(productCreateSchema.safeParse({ ...base, unit_price: -10 }).success).toBe(false)

    // Rechaza más de 2 decimales
    expect(productCreateSchema.safeParse({ ...base, unit_price: 123.456 }).success).toBe(false)
  })

  it("rechaza si no se selecciona una categoría", () => {
    const invalidProduct = {
      ...EMPTY_PRODUCT,
      code: "PROD-001",
      name: "Martillo de Peña",
      category_id: "",
    }

    expect(productCreateSchema.safeParse(invalidProduct).success).toBe(false)
  })
})

describe("productUpdateSchema", () => {
  it("valida la actualización de un producto sin código ni stock", () => {
    const updateData = {
      name: "Martillo de Peña 20oz Actualizado",
      category_id: "00000000-0000-4000-8002-000000000002",
      unit_price: 52.0,
      status: "active" as const,
    }

    expect(productUpdateSchema.safeParse(updateData).success).toBe(true)
  })

  it("ignora el código si se envía en la actualización (no forma parte del schema de update)", () => {
    const updateDataWithCode = {
      code: "PROD-CAMBIADO",
      name: "Martillo de Peña",
      category_id: "cat-1",
      unit_price: 45.0,
      status: "active" as const,
    }

    const result = productUpdateSchema.safeParse(updateDataWithCode)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty("code")
    }
  })
})