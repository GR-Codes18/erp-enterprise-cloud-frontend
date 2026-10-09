import { describe, expect, it } from "vitest"
import { applyListFilters, type ListFilterOptions } from "./filters"

interface Row {
  id: string
  name: string
  status: string
  warehouse_id: string
  created_at: string
}

const ROWS: Row[] = [
  { id: "1", name: "Alpha", status: "active", warehouse_id: "w1", created_at: "2026-01-10T08:00:00Z" },
  { id: "2", name: "Beta", status: "inactive", warehouse_id: "w1", created_at: "2026-02-15T10:00:00Z" },
  { id: "3", name: "alphabet", status: "active", warehouse_id: "w2", created_at: "2026-03-01T23:30:00Z" },
  { id: "4", name: "Delta", status: "active", warehouse_id: "w2", created_at: "2026-03-20T00:00:00Z" },
]

function run(query: string, options: Partial<ListFilterOptions<Row>> = {}) {
  return applyListFilters(ROWS, new URLSearchParams(query), {
    searchFields: ["name"],
    filterFields: ["status", "warehouse_id"],
    dateField: "created_at",
    ...options,
  })
}

/** Ids resultantes. Falla si el filtrado devolvió error. */
function ids(result: ReturnType<typeof run>): string[] {
  if (!result.ok) throw new Error(`Error inesperado: ${result.message}`)
  return result.items.map((row) => row.id)
}

describe("applyListFilters", () => {
  it("sin parámetros devuelve todo", () => {
    expect(ids(run(""))).toEqual(["1", "2", "3", "4"])
  })

  it("busca por texto parcial sin distinguir mayúsculas", () => {
    expect(ids(run("search=ALPHA"))).toEqual(["1", "3"])
  })

  it("filtra por un campo exacto", () => {
    expect(ids(run("status=active"))).toEqual(["1", "3", "4"])
  })

  it("combina varios filtros exactos", () => {
    expect(ids(run("status=active&warehouse_id=w2"))).toEqual(["3", "4"])
  })

  it("ignora un filtro con valor vacío", () => {
    expect(ids(run("status="))).toEqual(["1", "2", "3", "4"])
  })

  it("ignora parámetros de campos no permitidos", () => {
    expect(ids(run("id=1"))).toEqual(["1", "2", "3", "4"])
  })

  it("date_from incluye el día indicado", () => {
    expect(ids(run("date_from=2026-02-15"))).toEqual(["2", "3", "4"])
  })

  it("date_to incluye el día indicado", () => {
    expect(ids(run("date_to=2026-02-15"))).toEqual(["1", "2"])
  })

  it("aplica un rango con ambos extremos incluidos", () => {
    expect(ids(run("date_from=2026-02-15&date_to=2026-03-01"))).toEqual(["2", "3"])
  })

  it("interpreta el día en hora de Lima: 00:00 UTC del 20/03 es todavía el 19/03", () => {
    expect(ids(run("date_from=2026-03-19&date_to=2026-03-19"))).toEqual(["4"])
    expect(ids(run("date_from=2026-03-20"))).toEqual([])
  })

  it("ignora las fechas si el recurso no tiene campo de fecha", () => {
    expect(ids(run("date_from=2030-01-01", { dateField: undefined }))).toEqual(["1", "2", "3", "4"])
  })

  it("rechaza una fecha con formato inválido (400)", () => {
    const result = run("date_from=15/02/2026")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(400)
  })

  it("rechaza un rango invertido (422)", () => {
    const result = run("date_from=2026-03-01&date_to=2026-01-01")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(422)
  })

  it("combina búsqueda, filtro y fecha", () => {
    expect(ids(run("search=alpha&status=active&date_from=2026-03-01"))).toEqual(["3"])
  })
})