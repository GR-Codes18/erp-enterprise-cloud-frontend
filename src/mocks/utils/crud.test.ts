import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"
import { createCrudHandlers } from "./crud"

vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "http://localhost/api/v1", enableMocks: false },
}))

interface Item {
  id: string
  name: string
  locked: boolean
}

const BASE = "http://localhost/api/v1/items"
const json = (method: string, body: unknown) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

describe("createCrudHandlers (utils/crud)", () => {
  let server: ReturnType<typeof setupServer>
  let snapshots: (readonly Item[])[]

  beforeEach(() => {
    snapshots = []
    server = setupServer(
      ...createCrudHandlers<Item>({
        resource: "items",
        seed: [{ id: "1", name: "Bloqueado", locked: true }],
        searchFields: ["name"],
        latency: 0,
        createdFields: { locked: false },
        validate: ({ current }) =>
          current?.locked
            ? { status: 409, code: "LOCKED", message: "Registro bloqueado", errors: [] }
            : undefined,
        onChange: (items) => snapshots.push(items),
      }),
    )
    server.listen()
  })

  afterEach(() => server.close())

  it("los campos del servidor mandan sobre los del cliente al crear", async () => {
    const res = await fetch(BASE, json("POST", { name: "Nuevo", locked: true }))
    expect(res.status).toBe(201)
    expect((await res.json()).locked).toBe(false)
  })

  it("una regla rechazada responde con el formato de error del contrato", async () => {
    const res = await fetch(`${BASE}/1`, { method: "DELETE" })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ code: "LOCKED", message: "Registro bloqueado", errors: [] })
  })

  it("una escritura rechazada no cambia los datos", async () => {
    await fetch(`${BASE}/1`, json("PUT", { name: "Cambiado" }))
    const res = await fetch(`${BASE}/1`)
    expect((await res.json()).name).toBe("Bloqueado")
  })

  it("avisa de los cambios con los datos vigentes", async () => {
    await fetch(BASE, json("POST", { name: "Nuevo" }))
    expect(snapshots.at(-1)?.map((item) => item.name)).toEqual(["Bloqueado", "Nuevo"])
  })
})

interface Catalog {
  id: string
  code: string
  name: string
}

describe("createCrudHandlers con reglas de catálogo", () => {
  const CATALOG = "http://localhost/api/v1/catalog"
  let server: ReturnType<typeof setupServer>

  beforeEach(() => {
    server = setupServer(
      ...createCrudHandlers<Catalog>({
        resource: "catalog",
        seed: [
          { id: "1", code: "ITEM-1", name: "Producto Alpha" },
          { id: "2", code: "ITEM-2", name: "Producto Beta" },
        ],
        searchFields: ["code", "name"],
        latency: 0,
        insertAt: "start",
        prepareCreate: (body) => ({ code: String(body.code ?? "").trim().toUpperCase() }),
        uniqueFields: [{ field: "code", label: "código" }],
        immutableFields: ["code"],
        isInUse: (item) => item.id === "1",
        inUseMessage: "En uso",
      }),
    )
    server.listen()
  })

  afterEach(() => server.close())

  it("busca por texto y pagina", async () => {
    const res = await fetch(`${CATALOG}?search=alpha&page=1&size=10`)
    const data = await res.json()
    expect(data).toMatchObject({ total: 1, page: 1, size: 10, pages: 1 })
    expect(data.items[0].code).toBe("ITEM-1")
  })

  it("normaliza el alta y la muestra primero", async () => {
    const res = await fetch(CATALOG, json("POST", { code: " item-3 ", name: "Gamma" }))
    expect((await res.json()).code).toBe("ITEM-3")
    const list = await (await fetch(CATALOG)).json()
    expect(list.items[0].code).toBe("ITEM-3")
  })

  it("responde 409 DUPLICATE con el error en su campo, sin importar mayúsculas", async () => {
    const res = await fetch(CATALOG, json("POST", { code: "item-1", name: "Otro" }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe("DUPLICATE")
    expect(body.errors[0].field).toBe("code")
  })

  it("conserva los campos inmutables al editar", async () => {
    const res = await fetch(`${CATALOG}/2`, json("PUT", { code: "CAMBIADO", name: "Beta Modificado" }))
    const data = await res.json()
    expect(data.code).toBe("ITEM-2")
    expect(data.name).toBe("Beta Modificado")
  })

  it("responde 409 IN_USE al borrar un registro en uso y 204 si no lo está", async () => {
    const inUse = await fetch(`${CATALOG}/1`, { method: "DELETE" })
    expect(inUse.status).toBe(409)
    expect(await inUse.json()).toEqual({ code: "IN_USE", message: "En uso" })
    expect((await fetch(`${CATALOG}/2`, { method: "DELETE" })).status).toBe(204)
  })

  it("asigna ids únicos al crear, incluso después de un borrado", async () => {
    await fetch(`${CATALOG}/2`, { method: "DELETE" })
    const first = await (await fetch(CATALOG, json("POST", { id: "1", code: "ITEM-3", name: "C" }))).json()
    const second = await (await fetch(CATALOG, json("POST", { code: "ITEM-4", name: "D" }))).json()
    const ids = (await (await fetch(CATALOG)).json()).items.map((item: Catalog) => item.id)
    expect(first.id).not.toBe("1") // El id del cliente se ignora
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain(second.id)
  })

  it("responde 404 con el formato del contrato", async () => {
    const res = await fetch(`${CATALOG}/no-existe`)
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe("NOT_FOUND")
  })
})
