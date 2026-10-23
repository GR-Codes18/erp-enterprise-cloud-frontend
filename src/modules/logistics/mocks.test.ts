import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"
import { logisticsHandlers } from "./mocks"

vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "http://localhost/api/v1", enableMocks: true },
}))

describe("logistics mocks", () => {
  let server: ReturnType<typeof setupServer>

  beforeEach(() => {
    server = setupServer(...logisticsHandlers)
    server.listen()
  })

  afterEach(() => server.close())

  it("responde una lista vacía para los recursos de logística", async () => {
    const res = await fetch("http://localhost/api/v1/logistics/delivery-confirmations")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ total: 0, page: 1, size: 20, pages: 1 })
    expect(body.items).toEqual([])
  })
})
