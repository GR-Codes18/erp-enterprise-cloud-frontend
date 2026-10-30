import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "http://localhost/api/v1", enableMocks: false },
}))

const { masterCatalogHandlers } = await import("./mocks")
const API = "http://localhost/api/v1/maintenance/catalogs"
const json = (method: string, body: unknown) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

describe("catálogos compartidos de Maestro", () => {
  const server = setupServer(...masterCatalogHandlers)
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it("expone catálogos activos y persiste altas, ediciones y validaciones", async () => {
    const activeCurrencies = await (await fetch(`${API}/currencies?status=active`)).json()
    expect(activeCurrencies.items.map((item: { value: string }) => item.value)).toEqual(["PEN", "USD"])

    const createResponse = await fetch(
      `${API}/units`,
      json("POST", {
        code: "UND-008",
        name: "Tonelada",
        detail: "Peso",
        status: "active",
        value: "TON",
      }),
    )
    expect(createResponse.status).toBe(201)
    const created = await createResponse.json()
    expect(created).toMatchObject({ name: "Tonelada", value: "TON", status: "active" })

    const duplicateResponse = await fetch(
      `${API}/units`,
      json("POST", {
        code: "UND-008",
        name: "Unidad duplicada",
        detail: "",
        status: "active",
        value: "UND2",
      }),
    )
    expect(duplicateResponse.status).toBe(409)

    const updateResponse = await fetch(
      `${API}/units/${created.id}`,
      json("PATCH", { status: "inactive" }),
    )
    expect(updateResponse.status).toBe(200)
    const availableUnits = await (await fetch(`${API}/units?status=active&search=TON`)).json()
    expect(availableUnits.items).toHaveLength(0)

    const protectedCurrencyDelete = await fetch(`${API}/currencies/00000000-0000-4000-8000-000000008129`, {
      method: "DELETE",
    })
    expect(protectedCurrencyDelete.status).toBe(409)
    const usedUnitDelete = await fetch(`${API}/units/00000000-0000-4000-8000-000000008110`, {
      method: "DELETE",
    })
    expect(usedUnitDelete.status).toBe(409)
  })
})
