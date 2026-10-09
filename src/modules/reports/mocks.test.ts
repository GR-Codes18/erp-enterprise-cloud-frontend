import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "http://localhost/api/v1", enableMocks: false },
}))
vi.mock("@/shared/lib/dates", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/shared/lib/dates")>()
  return { ...original, todayInLima: () => "2026-10-08" }
})

const { reportHandlers } = await import("./mocks")
const API = "http://localhost/api/v1/reports"
const PERIOD = "date_from=2026-07-11&date_to=2026-10-08"

describe("mocks de Reportes", () => {
  const server = setupServer(...reportHandlers)
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it("el dashboard trae los indicadores y alertas del contrato", async () => {
    const res = await fetch(`${API}/dashboard?${PERIOD}`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Number(data.sales)).toBeGreaterThan(0)
    expect(data.critical_stock_count).toBe(data.alerts.low_stock.length)
    expect(data.alerts.low_stock.map((item: { product_name: string }) => item.product_name)).toContain("Cable Mellizo 2x16 AWG 100m")
    expect(Number(data.receivables.overdue)).toBeGreaterThan(0)
  })

  it("un rango invertido responde 422", async () => {
    expect((await fetch(`${API}/dashboard?date_from=2026-10-08&date_to=2026-01-01`)).status).toBe(422)
  })

  it("el reporte de ventas suma el periodo sin anulados", async () => {
    const data = await (await fetch(`${API}/sales?${PERIOD}&size=100`)).json()
    const voided = data.items.filter((row: { status_label: string }) => row.status_label === "Anulado")
    expect(voided.length).toBeGreaterThan(0)
    const expected = data.items
      .filter((row: { status_label: string }) => row.status_label !== "Anulado")
      .reduce((sum: number, row: { total: string }) => sum + Math.round(Number(row.total) * 100), 0)
    expect(Math.round(Number(data.sum) * 100)).toBe(expected)
  })

  it("la serie mensual tiene un punto por mes del rango, aunque sea cero", async () => {
    const points = await (await fetch(`${API}/analytics/monthly?${PERIOD}`)).json()
    expect(points.map((point: { month: string }) => point.month)).toEqual(["2026-07", "2026-08", "2026-09", "2026-10"])
  })
})
