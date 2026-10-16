import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "http://localhost/api/v1", enableMocks: false },
}))

const { customerHandlers } = await import("./mocks")
const server = setupServer(...customerHandlers)
const customerId = "00000000-0000-4000-8000-000000000001"

describe("dirección del cliente", () => {
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it("permite actualizar únicamente la dirección y la devuelve en el perfil", async () => {
    const update = await fetch(`http://localhost/api/v1/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: "Nueva dirección de prueba 100, Lima" }),
    })
    expect(update.status).toBe(200)
    expect(await update.json()).toMatchObject({ id: customerId, address: "Nueva dirección de prueba 100, Lima" })

    const detail = await fetch(`http://localhost/api/v1/customers/${customerId}`)
    expect(await detail.json()).toMatchObject({ id: customerId, address: "Nueva dirección de prueba 100, Lima" })
  })
})
