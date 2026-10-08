import { describe, expect, it } from "vitest"
import { EMPTY_PRODUCT, productInputSchema, type ProductStatus } from "./schema"

describe("productInputSchema", () => {
  it("valida un producto correcto", () => {
    const validProduct = {
      ...EMPTY_PRODUCT,
      code: "PROD-001",
      name: "Martillo de Peña 16oz",
      category_id: "00000000-0000-4000-8002-000000000001",
      unit_price: 45.5,
      stock: 25,
      status: "active" as const,
    }

    const result = productInputSchema.safeParse(validProduct)
    expect(result.success).toBe(true)
  })

  it("rechaza un precio negativo", () => {
    const invalidProduct = {
      ...EMPTY_PRODUCT,
      code: "PROD-001",
      name: "Martillo de Peña",
      category_id: "00000000-0000-4000-8002-000000000001",
      unit_price: -10,
    }

    const result = productInputSchema.safeParse(invalidProduct)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("El precio no puede ser negativo")
    }
  })

  it("rechaza un stock con decimales o negativo", () => {
    const invalidProduct = {
      ...EMPTY_PRODUCT,
      code: "PROD-001",
      name: "Martillo de Peña",
      category_id: "00000000-0000-4000-8002-000000000001",
      stock: 10.5,
    }

    const result = productInputSchema.safeParse(invalidProduct)
    expect(result.success).toBe(false)
  })

  it("rechaza si no se selecciona una categoría", () => {
    const invalidProduct = {
      ...EMPTY_PRODUCT,
      code: "PROD-001",
      name: "Martillo de Peña",
      category_id: "",
    }

    const result = productInputSchema.safeParse(invalidProduct)
    expect(result.success).toBe(false)
  })

  it("rechaza un estado inválido", () => {
    const invalidProduct = {
      ...EMPTY_PRODUCT,
      code: "PROD-001",
      name: "Martillo de Peña",
      category_id: "00000000-0000-4000-8002-000000000001",
      status: "pending" as unknown as ProductStatus,
    }

    const result = productInputSchema.safeParse(invalidProduct)
    expect(result.success).toBe(false)
  })
})