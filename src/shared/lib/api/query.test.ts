import { describe, expect, it } from "vitest"
import { toListQuery } from "./query"

describe("toListQuery", () => {
  it("conserva página, tamaño y búsqueda", () => {
    expect(toListQuery({ page: 2, size: 10, search: "ana" })).toEqual({
      page: 2,
      size: 10,
      search: "ana",
    })
  })

  it("aplana los filtros junto a los demás parámetros", () => {
    expect(
      toListQuery({ page: 1, filters: { status: "active", warehouse_id: "w1" }, date_from: "2026-01-01" }),
    ).toEqual({ page: 1, status: "active", warehouse_id: "w1", date_from: "2026-01-01" })
  })

  it("un filtro no puede pisar page ni search", () => {
    const query = toListQuery({ page: 1, search: "ana", filters: { page: "99", search: "x" } })
    expect(query.page).toBe(1)
    expect(query.search).toBe("ana")
  })

  it("funciona sin filtros", () => {
    expect(toListQuery({ page: 2 })).toEqual({ page: 2 })
  })
})