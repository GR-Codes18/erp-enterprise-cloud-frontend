import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "http://localhost/api/v1", enableMocks: false },
}))

const { seriesHandlers } = await import("./series/mock")
const { backupsHandlers } = await import("./backups/mock")
const { connectionsHandlers } = await import("./connections/mock")
const { seriesFormSchema } = await import("./series/schema")
const { backupFormSchema } = await import("./backups/schema")
const { connectionFormSchema } = await import("./connections/schema")

const API = "http://localhost/api/v1"
const server = setupServer(...seriesHandlers, ...backupsHandlers, ...connectionsHandlers)
beforeAll(() => server.listen())
afterAll(() => server.close())

const send = (method: string, url: string, body?: unknown) =>
  fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const newSeries = { tipo_documento: "Factura Electrónica", serie: "f002", sucursal_id: "SUC-03", correlativo: 0, vigencia: true }

describe("Series: administración", () => {
  it("crea una serie normalizada y no deja repetirla en la misma sucursal", async () => {
    const created = await send("POST", `${API}/series`, newSeries)
    expect(created.status).toBe(201)
    expect(await created.json()).toMatchObject({ serie: "F002", correlativo: 0, vigencia: true })

    const duplicate = await send("POST", `${API}/series`, newSeries)
    expect(duplicate.status).toBe(409)
    expect((await duplicate.json()).errors[0].field).toBe("serie")
  })

  it("el correlativo no puede bajar y el tipo, la serie y la sucursal no cambian", async () => {
    const list = await (await fetch(`${API}/series`)).json()
    const existing = list.items.find((item: { serie: string }) => item.serie === "F001")

    const lower = await send("PUT", `${API}/series/${existing.id}`, { ...existing, correlativo: 10 })
    expect(lower.status).toBe(422)
    expect((await lower.json()).errors[0].field).toBe("correlativo")

    const edited = await send("PUT", `${API}/series/${existing.id}`, { ...existing, serie: "ZZZZ", correlativo: existing.correlativo + 5 })
    expect(edited.status).toBe(200)
    expect(await edited.json()).toMatchObject({ serie: "F001", correlativo: existing.correlativo + 5 })
  })

  it("una serie que ya emitió se desactiva y una nueva sin uso se elimina", async () => {
    const list = await (await fetch(`${API}/series`)).json()
    const used = list.items.find((item: { serie: string }) => item.serie === "B001")
    const unused = list.items.find((item: { serie: string }) => item.serie === "F002")

    const blocked = await send("DELETE", `${API}/series/${used.id}`)
    expect(blocked.status).toBe(409)
    expect((await blocked.json()).code).toBe("IN_USE")

    const deactivated = await send("PATCH", `${API}/series/${used.id}`, { vigencia: false })
    expect((await deactivated.json()).vigencia).toBe(false)

    expect((await send("DELETE", `${API}/series/${unused.id}`)).status).toBe(204)
  })
})

describe("Respaldos: administración", () => {
  it("un respaldo nuevo queda pendiente y 'Ejecutar ahora' registra la ejecución", async () => {
    const created = await send("POST", `${API}/backups`, {
      frecuencia: "Mensual",
      destino: "s3://erp-backups-bucket/monthly/",
      politica_retencion: "12 Meses",
      // El cliente no puede imponer la ejecución ni el resultado
      resultado: "Exitoso",
      ultima_ejecucion: "2026-01-01T00:00:00Z",
    })
    expect(created.status).toBe(201)
    const backup = await created.json()
    expect(backup).toMatchObject({ resultado: "Pendiente", ultima_ejecucion: "", politica_retencion: "12 meses" })

    const run = await send("POST", `${API}/backups/${backup.id}/run`)
    expect(run.status).toBe(200)
    const executed = await run.json()
    expect(executed.resultado).toBe("Exitoso")
    expect(executed.ultima_ejecucion).not.toBe("")

    const again = await send("POST", `${API}/backups`, { frecuencia: "Mensual", destino: "s3://erp-backups-bucket/monthly/", politica_retencion: "6 meses" })
    expect(again.status).toBe(409)

    expect((await send("DELETE", `${API}/backups/${backup.id}`)).status).toBe(204)
  })
})

describe("Conexiones: administración", () => {
  it("una conexión activa se desactiva antes de poder eliminarse", async () => {
    const created = await send("POST", `${API}/connections`, {
      proveedor: "Interbank",
      servicio: "Conciliación bancaria",
      ambiente: "Pruebas / Sandbox",
      credenciales_referenciadas: "IBK_API_KEY",
      estado: "Activo",
    })
    expect(created.status).toBe(201)
    const connection = await created.json()
    expect(connection.ultima_respuesta).toBe("Sin probar")

    expect((await send("POST", `${API}/connections`, connection)).status).toBe(409)

    const blocked = await send("DELETE", `${API}/connections/${connection.id}`)
    expect(blocked.status).toBe(409)

    await send("PATCH", `${API}/connections/${connection.id}`, { estado: "Inactivo" })
    expect((await send("DELETE", `${API}/connections/${connection.id}`)).status).toBe(204)
  })
})

describe("Validación de formularios", () => {
  it("series: exige 4 caracteres y correlativo numérico", () => {
    const base = { tipo_documento: "Boleta de Venta", serie: "b001", sucursal_id: "SUC-01", correlativo: "12", vigencia: "true" }
    expect(seriesFormSchema.safeParse(base).data?.serie).toBe("B001")
    expect(seriesFormSchema.safeParse({ ...base, serie: "B01" }).success).toBe(false)
    expect(seriesFormSchema.safeParse({ ...base, correlativo: "-1" }).success).toBe(false)
    expect(seriesFormSchema.safeParse({ ...base, tipo_documento: "" }).success).toBe(false)
  })

  it("respaldos: destino con protocolo y retención con unidad", () => {
    const base = { frecuencia: "Diaria", destino: "s3://bucket/ruta/", politica_retencion: "30 días" }
    expect(backupFormSchema.safeParse(base).success).toBe(true)
    expect(backupFormSchema.safeParse({ ...base, destino: "/tmp/respaldo" }).success).toBe(false)
    expect(backupFormSchema.safeParse({ ...base, politica_retencion: "treinta" }).success).toBe(false)
  })

  it("conexiones: solo se acepta la referencia del secreto, no una clave con espacios", () => {
    const base = { proveedor: "BCP", servicio: "Cobranzas", ambiente: "Producción", credenciales_referenciadas: "BCP_API_KEY", estado: "Activo" }
    expect(connectionFormSchema.safeParse(base).success).toBe(true)
    expect(connectionFormSchema.safeParse({ ...base, credenciales_referenciadas: "mi clave secreta 123" }).success).toBe(false)
  })
})
