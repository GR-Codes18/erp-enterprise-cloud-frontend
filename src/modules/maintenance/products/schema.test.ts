import { describe, expect, it } from "vitest"
import {
  marginPercent,
  EMPTY_PRODUCT,
  isSoldBelowCost,
  productCreateSchema,
  productUpdateSchema,
  toProductUpdateInput,
  type Product,
} from "./schema"

const valid = {
  ...EMPTY_PRODUCT,
  sku: "PROD-100",
  name: "Martillo de Peña 16oz",
  category_id: "00000000-0000-4000-8002-000000000001",
  unit: "UND" as const,
  sale_price: "45.50",
  cost_price: "30.00",
  min_stock: 10,
}

const invalidFields = (input: unknown) => {
  const result = productCreateSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path[0])
}

describe("productCreateSchema", () => {
  it("acepta un producto válido", () => {
    expect(productCreateSchema.safeParse(valid).success).toBe(true)
  })

  it("normaliza el SKU: sin espacios y en mayúsculas", () => {
    expect(productCreateSchema.parse({ ...valid, sku: "  prod-100 " }).sku).toBe("PROD-100")
  })

  it("rechaza un SKU vacío, con espacios o caracteres no permitidos", () => {
    expect(invalidFields({ ...valid, sku: "" })).toContain("sku")
    expect(invalidFields({ ...valid, sku: "PROD 100" })).toContain("sku")
    expect(invalidFields({ ...valid, sku: "PROD#100" })).toContain("sku")
  })

  it("exige nombre, categoría y una unidad conocida", () => {
    expect(invalidFields({ ...valid, name: "A" })).toContain("name")
    expect(invalidFields({ ...valid, category_id: "" })).toContain("category_id")
    expect(invalidFields({ ...valid, unit: "TONELADA" })).toContain("unit")
  })

  it("los precios son texto decimal >= 0 con máximo 2 decimales", () => {
    for (const price of ["0", "0.00", "45", "45.5", "45.50"]) {
      expect(invalidFields({ ...valid, sale_price: price, cost_price: price })).toEqual([])
    }
    expect(invalidFields({ ...valid, sale_price: "" })).toContain("sale_price")
    expect(invalidFields({ ...valid, sale_price: "-1.00" })).toContain("sale_price")
    expect(invalidFields({ ...valid, cost_price: "10.999" })).toContain("cost_price")
    expect(invalidFields({ ...valid, cost_price: "10,50" })).toContain("cost_price")
  })

  it("el stock mínimo es un entero >= 0", () => {
    expect(invalidFields({ ...valid, min_stock: 0 })).toEqual([])
    expect(invalidFields({ ...valid, min_stock: -1 })).toContain("min_stock")
    expect(invalidFields({ ...valid, min_stock: 2.5 })).toContain("min_stock")
    expect(invalidFields({ ...valid, min_stock: Number.NaN })).toContain("min_stock")
  })

  it("permite vender por debajo del costo (solo se advierte)", () => {
    expect(productCreateSchema.safeParse({ ...valid, sale_price: "20.00", cost_price: "30.00" }).success).toBe(true)
  })
})

describe("productUpdateSchema", () => {
  it("no incluye el SKU: es inmutable", () => {
    const parsed = productUpdateSchema.parse({ ...valid, sku: "OTRO" })
    expect("sku" in parsed).toBe(false)
  })
})

describe("isSoldBelowCost", () => {
  it("advierte solo cuando la venta es menor que el costo", () => {
    expect(isSoldBelowCost("20.00", "30.00")).toBe(true)
    expect(isSoldBelowCost("30.00", "30.00")).toBe(false)
    expect(isSoldBelowCost("45.50", "30")).toBe(false)
  })

  it("compara en centavos, sin errores de coma flotante", () => {
    expect(isSoldBelowCost("0.29", "0.3")).toBe(true)
  })

  it("con montos incompletos o inválidos no advierte", () => {
    expect(isSoldBelowCost("", "30.00")).toBe(false)
    expect(isSoldBelowCost("abc", "30.00")).toBe(false)
  })
})

describe("toProductUpdateInput", () => {
  it("toma solo los campos editables del producto", () => {
    const product: Product = {
      ...valid,
      id: "00000000-0000-4000-8004-000000000001",
      sku: "PROD-001",
      category_name: "Herramientas Manuales",
      stock_total: 25,
    }
    expect(toProductUpdateInput(product)).toEqual({
      name: valid.name,
      category_id: valid.category_id,
      unit: "UND",
      sale_price: "45.50",
      cost_price: "30.00",
      min_stock: 10,
      status: "active",
    })
  })
})

describe("marginPercent", () => {
  it("calcula el margen sobre la venta", () => {
    expect(marginPercent("100.00", "60.00")).toBe(40)
    expect(marginPercent("45.50", "30")).toBe(34.1)
  })

  it("es negativo si se vende bajo el costo", () => {
    expect(marginPercent("50", "60")).toBe(-20)
  })

  it("devuelve null con montos inválidos o venta en cero", () => {
    expect(marginPercent("", "10")).toBeNull()
    expect(marginPercent("0", "10")).toBeNull()
  })
})
