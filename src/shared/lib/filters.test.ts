import { describe, expect, it } from "vitest"
import { FILTER_ALL, dateRangeParams, isValidDateRange, pickFilters } from "./filters"

describe("pickFilters", () => {
  it('descarta "todos" y los valores vacíos', () => {
    expect(pickFilters({ status: FILTER_ALL, warehouse_id: "", reason: "damage" })).toEqual({
      reason: "damage",
    })
  })

  it("sin selección no envía nada", () => {
    expect(pickFilters({ status: FILTER_ALL })).toEqual({})
  })
})

describe("isValidDateRange", () => {
  it("acepta extremos vacíos y rangos ordenados, incluso de un solo día", () => {
    expect(isValidDateRange("", "")).toBe(true)
    expect(isValidDateRange("2026-03-01", "")).toBe(true)
    expect(isValidDateRange("", "2026-03-01")).toBe(true)
    expect(isValidDateRange("2026-03-01", "2026-03-01")).toBe(true)
    expect(isValidDateRange("2026-03-01", "2026-03-31")).toBe(true)
  })

  it("rechaza un rango invertido", () => {
    expect(isValidDateRange("2026-03-31", "2026-03-01")).toBe(false)
  })
})

describe("dateRangeParams", () => {
  it("envía solo los extremos con valor", () => {
    expect(dateRangeParams("2026-03-01", "")).toEqual({ date_from: "2026-03-01" })
    expect(dateRangeParams("", "")).toEqual({})
    expect(dateRangeParams("2026-03-01", "2026-03-31")).toEqual({
      date_from: "2026-03-01",
      date_to: "2026-03-31",
    })
  })

  it("un rango invertido no se envía", () => {
    expect(dateRangeParams("2026-03-31", "2026-03-01")).toEqual({})
  })
})
