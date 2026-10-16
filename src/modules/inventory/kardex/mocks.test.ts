import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "http://localhost/api/v1", enableMocks: false },
}))

const { kardexHandlers } = await import("./mocks")
const server = setupServer(...kardexHandlers)

describe("vista comercial del Kardex", () => {
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it("filtra compras y ventas antes de paginar", async () => {
    const query = new URLSearchParams({
      product_id: "00000000-0000-4000-8004-000000000003",
      date_from: "2026-09-01",
      date_to: "2026-10-31",
      types: "purchase,sale",
      page: "1",
      size: "100",
    })
    const response = await fetch(`http://localhost/api/v1/inventory/kardex?${query}`)
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items.every((row: { type: string }) => ["purchase", "sale"].includes(row.type))).toBe(true)
  })
})
