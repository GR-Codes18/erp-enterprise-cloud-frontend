import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"
import { productRef, warehouseRef } from "@/mocks/refs"
import { WAREHOUSES } from "./mockRefs"
import { applyInventoryMovement, getAvailableQuantity, getKardexEntries, getStockRows, resetInventoryState } from "./state"

vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "http://localhost/api/v1", enableMocks: false },
}))

const { transferHandlers } = await import("./transfers/mocks")
const { adjustmentHandlers } = await import("./adjustments/mocks")
const API = "http://localhost/api/v1/inventory"

const post = (url: string, body: unknown = {}) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

describe("inventory state", () => {
  const server = setupServer(...transferHandlers, ...adjustmentHandlers)

  beforeAll(() => server.listen())
  afterAll(() => server.close())
  beforeEach(() => { resetInventoryState() })

  it("descuenta stock global por una venta y registra el movimiento", () => {
    const productId = productRef(3)
    const before = getAvailableQuantity(productId)

    applyInventoryMovement({
      product_id: productId,
      warehouse_id: "",
      quantity: 15,
      direction: "out",
      type: "sale",
      reference: "VT-TEST-001",
    })

    expect(getAvailableQuantity(productId)).toBe(before - 15)
    expect(getStockRows().some((row) => row.product_id === productId && row.quantity < 150)).toBe(true)
    expect(getKardexEntries().some((row) => row.type === "sale" && row.reference === "VT-TEST-001")).toBe(true)
  })

  it("suma stock en el almacén de la recepción de compra", () => {
    const productId = productRef(9)
    const warehouseId = warehouseRef(1)
    const before = getStockRows().find((row) => row.product_id === productId && row.warehouse_id === warehouseId)?.quantity ?? 0

    applyInventoryMovement({
      product_id: productId,
      warehouse_id: warehouseId,
      quantity: 25,
      direction: "in",
      type: "purchase",
      reference: "OC-TEST-001",
    })

    expect(getStockRows().find((row) => row.product_id === productId && row.warehouse_id === warehouseId)?.quantity).toBe(before + 25)
    expect(getKardexEntries().some((row) => row.type === "purchase" && row.reference === "OC-TEST-001")).toBe(true)
  })

  it("envía y recibe transferencias actualizando stock y kardex en ambos almacenes", async () => {
    const productId = productRef(1)
    const originWarehouseId = warehouseRef(1)
    const destinationWarehouseId = warehouseRef(3)

    const created = await fetch(`${API}/transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin_warehouse_id: originWarehouseId,
        destination_warehouse_id: destinationWarehouseId,
        items: [{ product_id: productId, quantity: 5 }],
      }),
    })

    expect(created.status).toBe(201)
    const transfer = await created.json()

    const originBefore = getStockRows().find((row) => row.product_id === productId && row.warehouse_id === originWarehouseId)?.quantity ?? 0
    const destinationBefore = getStockRows().find((row) => row.product_id === productId && row.warehouse_id === destinationWarehouseId)?.quantity ?? 0

    expect((await post(`${API}/transfers/${transfer.id}/send`)).status).toBe(200)
    expect(getStockRows().find((row) => row.product_id === productId && row.warehouse_id === originWarehouseId)?.quantity).toBe(originBefore - 5)
    expect(getKardexEntries().some((row) => row.type === "transfer_out" && row.reference === transfer.number)).toBe(true)

    expect((await post(`${API}/transfers/${transfer.id}/receive`)).status).toBe(200)
    expect(getStockRows().find((row) => row.product_id === productId && row.warehouse_id === destinationWarehouseId)?.quantity).toBe(destinationBefore + 5)
    expect(getKardexEntries().some((row) => row.type === "transfer_in" && row.reference === transfer.number)).toBe(true)
  })

  it("aplica ajustes de inventario sumando o restando según la dirección y registra el kardex", async () => {
    const productId = productRef(9)
    const warehouseId = warehouseRef(1)
    const before = getStockRows().find((row) => row.product_id === productId && row.warehouse_id === warehouseId)?.quantity ?? 0

    const created = await fetch(`${API}/adjustments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        warehouse_id: warehouseId,
        items: [{ product_id: productId, direction: "decrease", quantity: 4 }],
        reason: "physical_count",
        notes: "Regularización",
      }),
    })

    expect(created.status).toBe(201)
    const adjustment = await created.json()

    expect((await post(`${API}/adjustments/${adjustment.id}/apply`)).status).toBe(200)
    expect(getStockRows().find((row) => row.product_id === productId && row.warehouse_id === warehouseId)?.quantity).toBe(before - 4)
    expect(getKardexEntries().some((row) => row.type === "adjustment" && row.reference === adjustment.number)).toBe(true)
  })

  it("crea la fila del stock en el almacén escogido y no la etiqueta como otra bodega", () => {
    const productId = productRef(2)
    const warehouseId = warehouseRef(3)

    applyInventoryMovement({
      product_id: productId,
      warehouse_id: warehouseId,
      quantity: 8,
      direction: "in",
      type: "transfer_in",
      reference: "TR-TEST-002",
    })

    const row = getStockRows().find((candidate) => candidate.product_id === productId && candidate.warehouse_id === warehouseId)
    expect(row).toBeDefined()
    expect(row?.warehouse_name).toBe(WAREHOUSES.finished.name)
  })

  it("resuelve y filtra correctamente un almacén real seleccionado en stock y kardex", () => {
    const productId = productRef(11)
    const warehouseId = warehouseRef(7)

    applyInventoryMovement({
      product_id: productId,
      warehouse_id: warehouseId,
      quantity: 9,
      direction: "in",
      type: "purchase",
      reference: "OC-TEST-002",
    })

    const stockRow = getStockRows().find(
      (candidate) => candidate.product_id === productId && candidate.warehouse_id === warehouseId,
    )
    const kardexRows = getKardexEntries().filter((candidate) => candidate.warehouse_id === warehouseId)

    expect(stockRow).toBeDefined()
    expect(stockRow?.warehouse_name).toBe(WAREHOUSES.temporaryCallao.name)
    expect(kardexRows.some((candidate) => candidate.reference === "OC-TEST-002")).toBe(true)
    expect(kardexRows.some((candidate) => candidate.warehouse_name === WAREHOUSES.central.name)).toBe(false)
  })
})
