import { describe, expect, it } from "vitest"
import {
  FILTER_ALL,
  STATUS_LABELS,
  STATUS_TONES,
  STOCK_STATUSES,
  buildStockFilters,
  stockRowSchema,
} from "./schema"

const valid = {
  id: "00000000-0000-4000-8030-000000000001",
  product_id: "00000000-0000-4000-8004-000000000003",
  product_code: "PROD-003",
  product_name: "Cemento Portland Tipo I 42.5kg",
  category_id: "00000000-0000-4000-8002-000000000002",
  category_name: "Materiales de Construcción",
  warehouse_id: "00000000-0000-4000-8003-000000000002",
  warehouse_name: "Almacén de Materia Prima",
  unit: "UND",
  quantity: 100,
  min_stock: 60,
  status: "normal",
}

describe("stockRowSchema", () => {
  it("acepta una fila válida", () => {
    expect(stockRowSchema.safeParse(valid).success).toBe(true)
  })

  it("acepta cantidad cero (sin stock)", () => {
    expect(stockRowSchema.safeParse({ ...valid, quantity: 0, status: "out" }).success).toBe(true)
  })

  it("rechaza una cantidad negativa o con decimales", () => {
    expect(stockRowSchema.safeParse({ ...valid, quantity: -1 }).success).toBe(false)
    expect(stockRowSchema.safeParse({ ...valid, quantity: 1.5 }).success).toBe(false)
  })

  it("rechaza un estado desconocido", () => {
    expect(stockRowSchema.safeParse({ ...valid, status: "critical" }).success).toBe(false)
  })

  it("rechaza una fila sin producto o sin categoría", () => {
    const withoutProduct = { ...valid, product_id: undefined }
    const withoutCategory = { ...valid, category_id: undefined }
    expect(stockRowSchema.safeParse(withoutProduct).success).toBe(false)
    expect(stockRowSchema.safeParse(withoutCategory).success).toBe(false)
  })
})

describe("etiquetas y tonos", () => {
  it("todo estado tiene su etiqueta en español y su tono", () => {
    for (const status of STOCK_STATUSES) {
      expect(STATUS_LABELS[status]).toBeTruthy()
      expect(STATUS_TONES[status]).toBeTruthy()
    }
  })

  it("los estados se distinguen por texto, no solo por color", () => {
    const labels = STOCK_STATUSES.map((status) => STATUS_LABELS[status])
    expect(new Set(labels).size).toBe(STOCK_STATUSES.length)
  })
})

describe("buildStockFilters", () => {
  const all = { status: FILTER_ALL, warehouse_id: FILTER_ALL, category_id: FILTER_ALL }

  it("sin selección no envía ningún filtro", () => {
    expect(buildStockFilters(all)).toEqual({})
  })

  it("envía solo los filtros elegidos", () => {
    expect(buildStockFilters({ ...all, status: "low" })).toEqual({ status: "low" })
    expect(buildStockFilters({ ...all, warehouse_id: "abc" })).toEqual({ warehouse_id: "abc" })
    expect(buildStockFilters({ ...all, category_id: "xyz" })).toEqual({ category_id: "xyz" })
  })

  it("combina estado, almacén y categoría", () => {
    expect(buildStockFilters({ status: "out", warehouse_id: "abc", category_id: "xyz" })).toEqual({
      status: "out",
      warehouse_id: "abc",
      category_id: "xyz",
    })
  })
})