import { describe, expect, it } from "vitest"
import {
  FILTER_ALL,
  COMMERCIAL_KARDEX_TYPES,
  KARDEX_TYPES,
  KARDEX_TYPE_LABELS,
  buildKardexFilters,
  isKardexQueryReady,
  isValidDateRange,
  kardexRowSchema,
} from "./schema"

const valid = {
  id: "00000000-0000-4000-8031-000000000001",
  product_id: "00000000-0000-4000-8004-000000000003",
  warehouse_id: "00000000-0000-4000-8003-000000000002",
  warehouse_name: "Almacén de Materia Prima",
  occurred_at: "2026-09-01T15:00:00Z",
  type: "purchase",
  reference: "OC-2026-001",
  quantity_in: 300,
  quantity_out: 0,
  balance: 300,
}

describe("kardexRowSchema", () => {
  it("acepta una entrada válida", () => {
    expect(kardexRowSchema.safeParse(valid).success).toBe(true)
  })

  it("conserva nombre y SKU cuando la API los incluye", () => {
    expect(
      kardexRowSchema.safeParse({
        ...valid,
        product_name: "Cemento Portland Tipo I 42.5kg",
        product_sku: "PROD-003",
      }).success,
    ).toBe(true)
  })

  it("acepta una anulación de venta como entrada de inventario", () => {
    expect(
      kardexRowSchema.safeParse({
        ...valid,
        type: "sale_void",
        quantity_in: 2,
        quantity_out: 0,
      }).success,
    ).toBe(true)
  })

  it("acepta una salida válida y una referencia vacía", () => {
    const out = { ...valid, type: "sale", quantity_in: 0, quantity_out: 20, balance: 280, reference: "" }
    expect(kardexRowSchema.safeParse(out).success).toBe(true)
  })

  it("rechaza un movimiento con entrada y salida a la vez", () => {
    expect(kardexRowSchema.safeParse({ ...valid, quantity_out: 5 }).success).toBe(false)
  })

  it("rechaza un movimiento sin entrada ni salida", () => {
    expect(kardexRowSchema.safeParse({ ...valid, quantity_in: 0, quantity_out: 0 }).success).toBe(false)
  })

  it("rechaza cantidades negativas o con decimales y un saldo negativo", () => {
    expect(kardexRowSchema.safeParse({ ...valid, quantity_in: -1 }).success).toBe(false)
    expect(kardexRowSchema.safeParse({ ...valid, quantity_in: 1.5 }).success).toBe(false)
    expect(kardexRowSchema.safeParse({ ...valid, balance: -1 }).success).toBe(false)
  })

  it("rechaza un tipo de movimiento desconocido", () => {
    expect(kardexRowSchema.safeParse({ ...valid, type: "robo" }).success).toBe(false)
  })
})

describe("etiquetas", () => {
  it("todo tipo de movimiento tiene su etiqueta en español", () => {
    for (const type of KARDEX_TYPES) expect(KARDEX_TYPE_LABELS[type]).toBeTruthy()
  })
})

describe("isValidDateRange", () => {
  it("acepta rangos en orden y rangos abiertos", () => {
    expect(isValidDateRange("2026-09-01", "2026-10-31")).toBe(true)
    expect(isValidDateRange("2026-09-01", "2026-09-01")).toBe(true)
    expect(isValidDateRange("", "2026-10-31")).toBe(true)
  })

  it("rechaza desde posterior a hasta", () => {
    expect(isValidDateRange("2026-10-31", "2026-09-01")).toBe(false)
  })
})

describe("isKardexQueryReady", () => {
  const ready = { product_id: "abc", date_from: "2026-09-01", date_to: "2026-10-31" }

  it("se puede consultar con producto y rango completo", () => {
    expect(isKardexQueryReady(ready)).toBe(true)
  })

  it("exige producto", () => {
    expect(isKardexQueryReady({ ...ready, product_id: "" })).toBe(false)
  })

  it("exige las dos fechas", () => {
    expect(isKardexQueryReady({ ...ready, date_from: "" })).toBe(false)
    expect(isKardexQueryReady({ ...ready, date_to: "" })).toBe(false)
  })

  it("no consulta con un rango invertido", () => {
    expect(isKardexQueryReady({ ...ready, date_from: "2026-11-01" })).toBe(false)
  })

  it("permite consultar sin producto cuando el producto es opcional", () => {
    expect(
      isKardexQueryReady(
        { product_id: FILTER_ALL, date_from: "2026-09-01", date_to: "2026-09-01" },
        { requireProduct: false },
      ),
    ).toBe(true)
  })
})

describe("buildKardexFilters", () => {
  it("envía el producto y omite el almacén si no se eligió", () => {
    expect(buildKardexFilters({ product_id: "abc", warehouse_id: FILTER_ALL })).toEqual({
      product_id: "abc",
    })
  })

  it("envía producto y almacén cuando se eligen los dos", () => {
    expect(buildKardexFilters({ product_id: "abc", warehouse_id: "xyz" })).toEqual({
      product_id: "abc",
      warehouse_id: "xyz",
    })
  })

  it("limita la vista comercial a compras y ventas", () => {
    expect(buildKardexFilters({ product_id: "abc", warehouse_id: FILTER_ALL }, COMMERCIAL_KARDEX_TYPES)).toEqual({
      product_id: "abc",
      types: "purchase,sale",
    })
  })
})