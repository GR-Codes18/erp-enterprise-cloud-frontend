import { describe, expect, it } from "vitest"
import { lowStockRowSchema, monthLabel, niceTicks } from "./schema"

describe("monthLabel", () => {
  it("muestra el mes abreviado en español", () => {
    expect(monthLabel("2026-09")).toBe("sep 2026")
    expect(monthLabel("2026-01")).toBe("ene 2026")
  })

  it("un valor inesperado se muestra tal cual", () => {
    expect(monthLabel("2026-13")).toBe("2026-13")
  })
})

describe("niceTicks", () => {
  it("empieza en cero y termina en un máximo redondo que cubre el dato", () => {
    const ticks = niceTicks(1218.94)
    expect(ticks[0]).toBe(0)
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(1218.94)
    expect(ticks).toEqual([0, 500, 1000, 1500])
  })

  it("sin datos solo hay cero", () => {
    expect(niceTicks(0)).toEqual([0])
  })
})

describe("lowStockRowSchema", () => {
  it("exige stock, mínimo y faltante numéricos", () => {
    const row = { product_id: "p", sku: "PROD-009", product_name: "Cable", unit: "UND", stock: 15, min_stock: 20, shortfall: 5 }
    expect(lowStockRowSchema.safeParse(row).success).toBe(true)
    expect(lowStockRowSchema.safeParse({ ...row, stock: "15" }).success).toBe(false)
  })
})
