import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "http://localhost/api/v1", enableMocks: false },
}))

const { connectIntegrationHub, integrationHandlers } = await import("./hub")
const { logbookHandlers } = await import("@/modules/administration/logbook/mock")
const { auditHandlers } = await import("@/modules/administration/audit/mocks")
const { seriesHandlers } = await import("@/modules/administration/series/mock")

const API = "http://localhost/api/v1"
const server = setupServer(...integrationHandlers, ...logbookHandlers, ...auditHandlers, ...seriesHandlers)

beforeAll(() => {
  // El worker del navegador y el server de Node comparten la misma API de eventos
  connectIntegrationHub(server as unknown as Parameters<typeof connectIntegrationHub>[0])
  server.listen()
})
afterAll(() => server.close())

const json = async <T>(url: string) => (await fetch(url)).json() as Promise<T>
// La capa procesa la respuesta de forma asíncrona: se espera a que termine
const settle = () => new Promise((resolve) => setTimeout(resolve, 50))

describe("integración entre módulos", () => {
  it("un cambio en un módulo se registra solo en Bitácora, Auditoría y los contadores", async () => {
    const before = await json<{ total: number }>(`${API}/logbook`)
    const auditBefore = await json<{ total: number }>(`${API}/audit`)

    const created = await fetch(`${API}/series`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo_documento: "Factura", serie: "F009", sucursal_id: "Lima", correlativo: "000001", vigencia: true }),
    })
    expect(created.status).toBe(201)
    await settle()

    const after = await json<{ total: number; items: { accion: string; resultado: string }[] }>(`${API}/logbook`)
    expect(after.total).toBe(before.total + 1)
    expect(after.items[0].accion).toContain("Crear Serie")
    expect(after.items[0].resultado).toBe("Exitoso")

    const auditAfter = await json<{ total: number; items: { action: string; module: string }[] }>(`${API}/audit`)
    expect(auditAfter.total).toBe(auditBefore.total + 1)
    expect(auditAfter.items[0]).toMatchObject({ action: "create", module: "administration" })

    const flows = await json<{ id: string; eventos: number }[]>(`${API}/integration/flows`)
    expect(flows.find((flow) => flow.id === "flow-seguridad-auditoria")?.eventos).toBe(1)
  })

  it("una operación que falla queda registrada como fallida y genera una alerta", async () => {
    const missing = await fetch(`${API}/series/no-existe`, { method: "DELETE" })
    expect(missing.status).toBe(404)
    await settle()

    const log = await json<{ items: { resultado: string }[] }>(`${API}/logbook`)
    expect(log.items[0].resultado).toBe("Fallido")

    const alerts = await json<{ items: { tipo: string }[] }>(`${API}/integration/notifications`)
    expect(alerts.items[0].tipo).toBe("alert")
  })

  it("las consultas (GET) no se registran", async () => {
    const before = await json<{ total: number }>(`${API}/logbook`)
    await json(`${API}/series`)
    await settle()
    const after = await json<{ total: number }>(`${API}/logbook`)
    expect(after.total).toBe(before.total)
  })
})
