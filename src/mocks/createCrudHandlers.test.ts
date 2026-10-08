import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { createCrudHandlers } from "./createCrudHandlers"

interface TestItem {
  id: string
  code: string
  name: string
  status: "active" | "inactive"
}

describe("createCrudHandlers", () => {
  let items: TestItem[]
  let server: ReturnType<typeof setupServer>

  beforeEach(() => {
    items = [
      { id: "1", code: "ITEM-1", name: "Producto Alpha", status: "active" },
      { id: "2", code: "ITEM-2", name: "Producto Beta", status: "active" },
    ]

    const handlers = createCrudHandlers<TestItem>({
      endpoint: "http://localhost/api/test-items",
      items,
      searchFields: ["code", "name"],
      uniqueFields: [{ field: "code", label: "código" }],
      immutableFields: ["code"],
      inUseIds: ["1"],
    })

    server = setupServer(...handlers)
    server.listen()
  })

  afterEach(() => {
    server.close()
  })

  it("lista elementos con paginación y estructura correcta", async () => {
    const res = await fetch("http://localhost/api/test-items?page=1&size=10")
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.items.length).toBe(2)
    expect(data.total).toBe(2)
  })

  it("filtra por búsqueda por texto", async () => {
    const res = await fetch("http://localhost/api/test-items?search=alpha")
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.items.length).toBe(1)
    expect(data.items[0].code).toBe("ITEM-1")
  })

  it("responde 409 con fieldErrors ante código duplicado en POST", async () => {
    const res = await fetch("http://localhost/api/test-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "3", code: "ITEM-1", name: "Nuevo Item", status: "active" }),
    })
    const data = await res.json()
    expect(res.status).toBe(409)
    expect(data.fieldErrors?.[0]?.field).toBe("code")
  })

  it("respeta campos inmutables en PUT", async () => {
    const res = await fetch("http://localhost/api/test-items/2", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "2", code: "CAMBIADO", name: "Beta Modificado", status: "active" }),
    })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.code).toBe("ITEM-2") // Conservó el código inmutable
    expect(data.name).toBe("Beta Modificado")
  })

  it("responde 409 al intentar eliminar un id en uso", async () => {
    const res = await fetch("http://localhost/api/test-items/1", {
      method: "DELETE",
    })
    expect(res.status).toBe(409)
  })

  it("elimina el registro si no está en uso", async () => {
    const res = await fetch("http://localhost/api/test-items/2", {
      method: "DELETE",
    })
    expect(res.status).toBe(204)
    expect(items.length).toBe(1)
  })
})