import { PRODUCTS, WAREHOUSES, categoryRef, productRef, warehouseRef } from "./mockRefs"
import type { KardexRow, KardexType } from "./kardex/schema"
import type { StockRow, StockStatus } from "./stock/schema"

const stockSeed: StockRow[] = [
  { id: "00000000-0000-4000-8030-000000000001", product_id: productRef(PRODUCTS.hammer.n), product_sku: PRODUCTS.hammer.sku, product_name: PRODUCTS.hammer.name, category_id: categoryRef(PRODUCTS.hammer.category), category_name: PRODUCTS.hammer.categoryName, warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, unit: PRODUCTS.hammer.unit, quantity: 15, min_stock: PRODUCTS.hammer.minStock, status: "normal", below_min: false },
  { id: "00000000-0000-4000-8030-000000000002", product_id: productRef(PRODUCTS.hammer.n), product_sku: PRODUCTS.hammer.sku, product_name: PRODUCTS.hammer.name, category_id: categoryRef(PRODUCTS.hammer.category), category_name: PRODUCTS.hammer.categoryName, warehouse_id: warehouseRef(WAREHOUSES.finished.n), warehouse_name: WAREHOUSES.finished.name, unit: PRODUCTS.hammer.unit, quantity: 10, min_stock: PRODUCTS.hammer.minStock, status: "low", below_min: true },
  { id: "00000000-0000-4000-8030-000000000003", product_id: productRef(PRODUCTS.screwdrivers.n), product_sku: PRODUCTS.screwdrivers.sku, product_name: PRODUCTS.screwdrivers.name, category_id: categoryRef(PRODUCTS.screwdrivers.category), category_name: PRODUCTS.screwdrivers.categoryName, warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, unit: PRODUCTS.screwdrivers.unit, quantity: 40, min_stock: PRODUCTS.screwdrivers.minStock, status: "normal", below_min: false },
  { id: "00000000-0000-4000-8030-000000000004", product_id: productRef(PRODUCTS.cement.n), product_sku: PRODUCTS.cement.sku, product_name: PRODUCTS.cement.name, category_id: categoryRef(PRODUCTS.cement.category), category_name: PRODUCTS.cement.categoryName, warehouse_id: warehouseRef(WAREHOUSES.rawMaterial.n), warehouse_name: WAREHOUSES.rawMaterial.name, unit: PRODUCTS.cement.unit, quantity: 100, min_stock: PRODUCTS.cement.minStock, status: "low", below_min: true },
  { id: "00000000-0000-4000-8030-000000000005", product_id: productRef(PRODUCTS.cement.n), product_sku: PRODUCTS.cement.sku, product_name: PRODUCTS.cement.name, category_id: categoryRef(PRODUCTS.cement.category), category_name: PRODUCTS.cement.categoryName, warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, unit: PRODUCTS.cement.unit, quantity: 50, min_stock: PRODUCTS.cement.minStock, status: "low", below_min: true },
  { id: "00000000-0000-4000-8030-000000000006", product_id: productRef(PRODUCTS.brick.n), product_sku: PRODUCTS.brick.sku, product_name: PRODUCTS.brick.name, category_id: categoryRef(PRODUCTS.brick.category), category_name: PRODUCTS.brick.categoryName, warehouse_id: warehouseRef(WAREHOUSES.rawMaterial.n), warehouse_name: WAREHOUSES.rawMaterial.name, unit: PRODUCTS.brick.unit, quantity: 800, min_stock: PRODUCTS.brick.minStock, status: "normal", below_min: false },
  { id: "00000000-0000-4000-8030-000000000007", product_id: productRef(PRODUCTS.brick.n), product_sku: PRODUCTS.brick.sku, product_name: PRODUCTS.brick.name, category_id: categoryRef(PRODUCTS.brick.category), category_name: PRODUCTS.brick.categoryName, warehouse_id: warehouseRef(WAREHOUSES.south.n), warehouse_name: WAREHOUSES.south.name, unit: PRODUCTS.brick.unit, quantity: 400, min_stock: PRODUCTS.brick.minStock, status: "normal", below_min: false },
  { id: "00000000-0000-4000-8030-000000000008", product_id: productRef(PRODUCTS.helmet.n), product_sku: PRODUCTS.helmet.sku, product_name: PRODUCTS.helmet.name, category_id: categoryRef(PRODUCTS.helmet.category), category_name: PRODUCTS.helmet.categoryName, warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, unit: PRODUCTS.helmet.unit, quantity: 80, min_stock: PRODUCTS.helmet.minStock, status: "normal", below_min: false },
  { id: "00000000-0000-4000-8030-000000000009", product_id: productRef(PRODUCTS.gloves.n), product_sku: PRODUCTS.gloves.sku, product_name: PRODUCTS.gloves.name, category_id: categoryRef(PRODUCTS.gloves.category), category_name: PRODUCTS.gloves.categoryName, warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, unit: PRODUCTS.gloves.unit, quantity: 120, min_stock: PRODUCTS.gloves.minStock, status: "normal", below_min: false },
  { id: "00000000-0000-4000-8030-000000000010", product_id: productRef(PRODUCTS.gloves.n), product_sku: PRODUCTS.gloves.sku, product_name: PRODUCTS.gloves.name, category_id: categoryRef(PRODUCTS.gloves.category), category_name: PRODUCTS.gloves.categoryName, warehouse_id: warehouseRef(WAREHOUSES.north.n), warehouse_name: WAREHOUSES.north.name, unit: PRODUCTS.gloves.unit, quantity: 80, min_stock: PRODUCTS.gloves.minStock, status: "normal", below_min: false },
  { id: "00000000-0000-4000-8030-000000000011", product_id: productRef(PRODUCTS.paint.n), product_sku: PRODUCTS.paint.sku, product_name: PRODUCTS.paint.name, category_id: categoryRef(PRODUCTS.paint.category), category_name: PRODUCTS.paint.categoryName, warehouse_id: warehouseRef(WAREHOUSES.finished.n), warehouse_name: WAREHOUSES.finished.name, unit: PRODUCTS.paint.unit, quantity: 35, min_stock: PRODUCTS.paint.minStock, status: "low", below_min: true },
  { id: "00000000-0000-4000-8030-000000000012", product_id: productRef(PRODUCTS.pvc.n), product_sku: PRODUCTS.pvc.sku, product_name: PRODUCTS.pvc.name, category_id: categoryRef(PRODUCTS.pvc.category), category_name: PRODUCTS.pvc.categoryName, warehouse_id: warehouseRef(WAREHOUSES.rawMaterial.n), warehouse_name: WAREHOUSES.rawMaterial.name, unit: PRODUCTS.pvc.unit, quantity: 60, min_stock: PRODUCTS.pvc.minStock, status: "normal", below_min: false },
  { id: "00000000-0000-4000-8030-000000000013", product_id: productRef(PRODUCTS.pvc.n), product_sku: PRODUCTS.pvc.sku, product_name: PRODUCTS.pvc.name, category_id: categoryRef(PRODUCTS.pvc.category), category_name: PRODUCTS.pvc.categoryName, warehouse_id: warehouseRef(WAREHOUSES.south.n), warehouse_name: WAREHOUSES.south.name, unit: PRODUCTS.pvc.unit, quantity: 30, min_stock: PRODUCTS.pvc.minStock, status: "low", below_min: true },
  { id: "00000000-0000-4000-8030-000000000014", product_id: productRef(PRODUCTS.cable.n), product_sku: PRODUCTS.cable.sku, product_name: PRODUCTS.cable.name, category_id: categoryRef(PRODUCTS.cable.category), category_name: PRODUCTS.cable.categoryName, warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, unit: PRODUCTS.cable.unit, quantity: 15, min_stock: PRODUCTS.cable.minStock, status: "low", below_min: true },
  { id: "00000000-0000-4000-8030-000000000015", product_id: productRef(PRODUCTS.padlock.n), product_sku: PRODUCTS.padlock.sku, product_name: PRODUCTS.padlock.name, category_id: categoryRef(PRODUCTS.padlock.category), category_name: PRODUCTS.padlock.categoryName, warehouse_id: warehouseRef(WAREHOUSES.tools.n), warehouse_name: WAREHOUSES.tools.name, unit: PRODUCTS.padlock.unit, quantity: 50, min_stock: PRODUCTS.padlock.minStock, status: "normal", below_min: false },
  { id: "00000000-0000-4000-8030-000000000016", product_id: productRef(PRODUCTS.led.n), product_sku: PRODUCTS.led.sku, product_name: PRODUCTS.led.name, category_id: categoryRef(PRODUCTS.led.category), category_name: PRODUCTS.led.categoryName, warehouse_id: warehouseRef(WAREHOUSES.sanJuan.n), warehouse_name: WAREHOUSES.sanJuan.name, unit: PRODUCTS.led.unit, quantity: 12, min_stock: PRODUCTS.led.minStock, status: "low", below_min: true },
  { id: "00000000-0000-4000-8030-000000000017", product_id: productRef(PRODUCTS.led.n), product_sku: PRODUCTS.led.sku, product_name: PRODUCTS.led.name, category_id: categoryRef(PRODUCTS.led.category), category_name: PRODUCTS.led.categoryName, warehouse_id: warehouseRef(WAREHOUSES.ate.n), warehouse_name: WAREHOUSES.ate.name, unit: PRODUCTS.led.unit, quantity: 8, min_stock: PRODUCTS.led.minStock, status: "low", below_min: true },
  { id: "00000000-0000-4000-8030-000000000018", product_id: productRef(PRODUCTS.silicone.n), product_sku: PRODUCTS.silicone.sku, product_name: PRODUCTS.silicone.name, category_id: categoryRef(PRODUCTS.silicone.category), category_name: PRODUCTS.silicone.categoryName, warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, unit: PRODUCTS.silicone.unit, quantity: 0, min_stock: PRODUCTS.silicone.minStock, status: "out", below_min: true },
]

const kardexSeed: KardexRow[] = [
  { id: "00000000-0000-4000-8031-000000000001", product_id: productRef(PRODUCTS.cement.n), warehouse_id: warehouseRef(WAREHOUSES.rawMaterial.n), warehouse_name: WAREHOUSES.rawMaterial.name, occurred_at: "2026-09-01T15:00:00Z", type: "purchase", reference: "OC-2026-001", quantity_in: 300, quantity_out: 0, balance: 300 },
  { id: "00000000-0000-4000-8031-000000000002", product_id: productRef(PRODUCTS.cement.n), warehouse_id: warehouseRef(WAREHOUSES.rawMaterial.n), warehouse_name: WAREHOUSES.rawMaterial.name, occurred_at: "2026-09-03T15:00:00Z", type: "sale", reference: "VT-00001", quantity_in: 0, quantity_out: 20, balance: 280 },
  { id: "00000000-0000-4000-8031-000000000003", product_id: productRef(PRODUCTS.cement.n), warehouse_id: warehouseRef(WAREHOUSES.rawMaterial.n), warehouse_name: WAREHOUSES.rawMaterial.name, occurred_at: "2026-09-06T15:00:00Z", type: "sale", reference: "VT-00002", quantity_in: 0, quantity_out: 25, balance: 255 },
  { id: "00000000-0000-4000-8031-000000000004", product_id: productRef(PRODUCTS.cement.n), warehouse_id: warehouseRef(WAREHOUSES.rawMaterial.n), warehouse_name: WAREHOUSES.rawMaterial.name, occurred_at: "2026-09-09T15:00:00Z", type: "sale", reference: "VT-00004", quantity_in: 0, quantity_out: 15, balance: 240 },
  { id: "00000000-0000-4000-8031-000000000005", product_id: productRef(PRODUCTS.cement.n), warehouse_id: warehouseRef(WAREHOUSES.rawMaterial.n), warehouse_name: WAREHOUSES.rawMaterial.name, occurred_at: "2026-09-12T15:00:00Z", type: "sale", reference: "VT-00005", quantity_in: 0, quantity_out: 30, balance: 210 },
  { id: "00000000-0000-4000-8031-000000000006", product_id: productRef(PRODUCTS.cement.n), warehouse_id: warehouseRef(WAREHOUSES.rawMaterial.n), warehouse_name: WAREHOUSES.rawMaterial.name, occurred_at: "2026-09-15T15:00:00Z", type: "return", reference: "DV-0002", quantity_in: 5, quantity_out: 0, balance: 215 },
  { id: "00000000-0000-4000-8031-000000000007", product_id: productRef(PRODUCTS.cement.n), warehouse_id: warehouseRef(WAREHOUSES.rawMaterial.n), warehouse_name: WAREHOUSES.rawMaterial.name, occurred_at: "2026-09-18T15:00:00Z", type: "sale", reference: "VT-00007", quantity_in: 0, quantity_out: 35, balance: 180 },
  { id: "00000000-0000-4000-8031-000000000008", product_id: productRef(PRODUCTS.cement.n), warehouse_id: warehouseRef(WAREHOUSES.rawMaterial.n), warehouse_name: WAREHOUSES.rawMaterial.name, occurred_at: "2026-09-22T15:00:00Z", type: "sale", reference: "VT-00008", quantity_in: 0, quantity_out: 20, balance: 160 },
  { id: "00000000-0000-4000-8031-000000000009", product_id: productRef(PRODUCTS.cement.n), warehouse_id: warehouseRef(WAREHOUSES.rawMaterial.n), warehouse_name: WAREHOUSES.rawMaterial.name, occurred_at: "2026-09-28T15:00:00Z", type: "sale", reference: "VT-00011", quantity_in: 0, quantity_out: 20, balance: 140 },
  { id: "00000000-0000-4000-8031-000000000010", product_id: productRef(PRODUCTS.cement.n), warehouse_id: warehouseRef(WAREHOUSES.rawMaterial.n), warehouse_name: WAREHOUSES.rawMaterial.name, occurred_at: "2026-10-02T15:00:00Z", type: "transfer_out", reference: "TR-1201", quantity_in: 0, quantity_out: 40, balance: 100 },
  { id: "00000000-0000-4000-8031-000000000011", product_id: productRef(PRODUCTS.cement.n), warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, occurred_at: "2026-10-02T15:00:00Z", type: "transfer_in", reference: "TR-1201", quantity_in: 40, quantity_out: 0, balance: 40 },
  { id: "00000000-0000-4000-8031-000000000012", product_id: productRef(PRODUCTS.cement.n), warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, occurred_at: "2026-10-05T15:00:00Z", type: "adjustment", reference: "AJ-0301", quantity_in: 10, quantity_out: 0, balance: 50 },
  { id: "00000000-0000-4000-8031-000000000013", product_id: productRef(PRODUCTS.hammer.n), warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, occurred_at: "2026-09-18T15:00:00Z", type: "purchase", reference: "OC-2026-002", quantity_in: 30, quantity_out: 0, balance: 30 },
  { id: "00000000-0000-4000-8031-000000000014", product_id: productRef(PRODUCTS.hammer.n), warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, occurred_at: "2026-09-25T15:00:00Z", type: "sale", reference: "VT-00009", quantity_in: 0, quantity_out: 5, balance: 25 },
  { id: "00000000-0000-4000-8031-000000000015", product_id: productRef(PRODUCTS.hammer.n), warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, occurred_at: "2026-10-01T15:00:00Z", type: "transfer_out", reference: "TR-1202", quantity_in: 0, quantity_out: 10, balance: 15 },
  { id: "00000000-0000-4000-8031-000000000016", product_id: productRef(PRODUCTS.hammer.n), warehouse_id: warehouseRef(WAREHOUSES.finished.n), warehouse_name: WAREHOUSES.finished.name, occurred_at: "2026-10-01T15:00:00Z", type: "transfer_in", reference: "TR-1202", quantity_in: 10, quantity_out: 0, balance: 10 },
  { id: "00000000-0000-4000-8031-000000000017", product_id: productRef(PRODUCTS.cable.n), warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, occurred_at: "2026-09-15T15:00:00Z", type: "purchase", reference: "OC-2026-003", quantity_in: 40, quantity_out: 0, balance: 40 },
  { id: "00000000-0000-4000-8031-000000000018", product_id: productRef(PRODUCTS.cable.n), warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, occurred_at: "2026-09-30T15:00:00Z", type: "sale", reference: "VT-00013", quantity_in: 0, quantity_out: 20, balance: 20 },
  { id: "00000000-0000-4000-8031-000000000019", product_id: productRef(PRODUCTS.cable.n), warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, occurred_at: "2026-10-04T15:00:00Z", type: "adjustment", reference: "AJ-0302", quantity_in: 0, quantity_out: 5, balance: 15 },
  { id: "00000000-0000-4000-8031-000000000020", product_id: productRef(PRODUCTS.paint.n), warehouse_id: warehouseRef(WAREHOUSES.finished.n), warehouse_name: WAREHOUSES.finished.name, occurred_at: "2026-09-22T15:00:00Z", type: "purchase", reference: "OC-2026-004", quantity_in: 50, quantity_out: 0, balance: 50 },
  { id: "00000000-0000-4000-8031-000000000021", product_id: productRef(PRODUCTS.paint.n), warehouse_id: warehouseRef(WAREHOUSES.finished.n), warehouse_name: WAREHOUSES.finished.name, occurred_at: "2026-09-29T15:00:00Z", type: "sale", reference: "VT-00012", quantity_in: 0, quantity_out: 18, balance: 32 },
  { id: "00000000-0000-4000-8031-000000000022", product_id: productRef(PRODUCTS.paint.n), warehouse_id: warehouseRef(WAREHOUSES.finished.n), warehouse_name: WAREHOUSES.finished.name, occurred_at: "2026-10-03T15:00:00Z", type: "return", reference: "DV-0001", quantity_in: 3, quantity_out: 0, balance: 35 },
  { id: "00000000-0000-4000-8031-000000000023", product_id: productRef(PRODUCTS.silicone.n), warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, occurred_at: "2026-09-10T15:00:00Z", type: "purchase", reference: "OC-2026-005", quantity_in: 20, quantity_out: 0, balance: 20 },
  { id: "00000000-0000-4000-8031-000000000024", product_id: productRef(PRODUCTS.silicone.n), warehouse_id: warehouseRef(WAREHOUSES.central.n), warehouse_name: WAREHOUSES.central.name, occurred_at: "2026-09-20T15:00:00Z", type: "sale", reference: "VT-00006", quantity_in: 0, quantity_out: 20, balance: 0 },
]

let stockItems = [...stockSeed]
let kardexItems = [...kardexSeed]

type ReservationItem = {
  id: string
  order_id: string
  product_id: string
  warehouse_id: string
  quantity: number
  expires_at: string
}

let reservationItems: ReservationItem[] = []

function expireReservations(referenceTime = new Date()) {
  const now = referenceTime.toISOString()
  const expired = reservationItems.filter((item) => item.expires_at && item.expires_at <= now)
  if (expired.length === 0) return

  for (const reservation of expired) {
    const targetWarehouse = reservation.warehouse_id || preferredWarehouseForProduct(reservation.product_id)
    const currentQty = findMatchingStockRow(reservation.product_id, targetWarehouse)?.quantity ?? 0
    upsertStockRow(reservation.product_id, targetWarehouse, currentQty + reservation.quantity)
    appendKardexEntry({
      product_id: reservation.product_id,
      warehouse_id: targetWarehouse,
      reference: `RES-${reservation.order_id}`,
      type: "adjustment",
      quantity_in: reservation.quantity,
      quantity_out: 0,
      occurred_at: reservation.expires_at,
    })
  }

  reservationItems = reservationItems.filter((item) => !expired.some((expiredItem) => expiredItem.id === item.id))
}

export function reserveStockForOrder({
  order_id,
  items,
  expires_at,
}: {
  order_id: string
  items: { product_id: string; warehouse_id: string; quantity: number }[]
  expires_at: string
}) {
  const expiresAt = expires_at || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

  for (const item of items) {
    const targetWarehouse = item.warehouse_id || preferredWarehouseForProduct(item.product_id)
    const current = findMatchingStockRow(item.product_id, targetWarehouse)
    const currentQty = current?.quantity ?? 0
    if (item.quantity <= 0 || currentQty < item.quantity) {
      return { ok: false, code: "INSUFFICIENT_STOCK", message: "No hay stock suficiente para reservar." }
    }

    const nextQty = Math.max(0, currentQty - item.quantity)
    upsertStockRow(item.product_id, targetWarehouse, nextQty)
    appendKardexEntry({
      product_id: item.product_id,
      warehouse_id: targetWarehouse,
      reference: `RES-${order_id}`,
      type: "adjustment",
      quantity_in: 0,
      quantity_out: item.quantity,
      occurred_at: new Date().toISOString(),
    })

    reservationItems = [
      ...reservationItems,
      {
        id: `res-${order_id}-${item.product_id}-${targetWarehouse}`,
        order_id,
        product_id: item.product_id,
        warehouse_id: targetWarehouse,
        quantity: item.quantity,
        expires_at: expiresAt,
      },
    ]
  }

  return { ok: true, reservation_expires_at: expiresAt }
}

export function releaseReservationForOrder(order_id: string) {
  const active = reservationItems.filter((item) => item.order_id === order_id)
  if (active.length === 0) return false

  for (const reservation of active) {
    const currentQty = findMatchingStockRow(reservation.product_id, reservation.warehouse_id)?.quantity ?? 0
    upsertStockRow(reservation.product_id, reservation.warehouse_id, currentQty + reservation.quantity)
    appendKardexEntry({
      product_id: reservation.product_id,
      warehouse_id: reservation.warehouse_id,
      reference: `RES-${order_id}`,
      type: "adjustment",
      quantity_in: reservation.quantity,
      quantity_out: 0,
      occurred_at: new Date().toISOString(),
    })
  }

  reservationItems = reservationItems.filter((item) => item.order_id !== order_id)
  return true
}

function normalizeStatus(quantity: number, minStock: number): StockStatus {
  if (quantity === 0) return "out"
  return quantity <= minStock ? "low" : "normal"
}

function syncStockRow(row: StockRow): StockRow {
  const status = normalizeStatus(row.quantity, row.min_stock)
  return { ...row, status, below_min: row.quantity <= row.min_stock }
}

function findMatchingStockRow(productId: string, warehouseId: string) {
  return stockItems.find((row) => row.product_id === productId && row.warehouse_id === warehouseId)
}

function preferredWarehouseForProduct(productId: string) {
  const rows = stockItems.filter((row) => row.product_id === productId)
  return rows.sort((a, b) => b.quantity - a.quantity)[0]?.warehouse_id ?? warehouseRef(WAREHOUSES.central.n)
}

function resolveWarehouseName(warehouseId: string) {
  return Object.values(WAREHOUSES).find((candidate) => warehouseRef(candidate.n) === warehouseId)?.name ?? "Almacén"
}

function upsertStockRow(productId: string, warehouseId: string, quantity: number) {
  const product = Object.values(PRODUCTS).find((candidate) => productRef(candidate.n) === productId)
  const targetWarehouse = warehouseId || preferredWarehouseForProduct(productId)
  const existing = findMatchingStockRow(productId, targetWarehouse)
  if (existing) {
    const next = syncStockRow({ ...existing, quantity, min_stock: product?.minStock ?? existing.min_stock })
    stockItems = stockItems.map((row) => (row.id === existing.id ? next : row))
    return next
  }

  const fallbackProduct = product ?? Object.values(PRODUCTS)[0]
  const row: StockRow = {
    id: `00000000-0000-4000-8030-${String(stockItems.length + 1).padStart(12, "0")}`,
    product_id: productId,
    product_sku: fallbackProduct.sku,
    product_name: fallbackProduct.name,
    category_id: categoryRef(fallbackProduct.category),
    category_name: fallbackProduct.categoryName,
    warehouse_id: targetWarehouse,
    warehouse_name: resolveWarehouseName(targetWarehouse),
    unit: fallbackProduct.unit,
    quantity,
    min_stock: fallbackProduct.minStock,
    status: normalizeStatus(quantity, fallbackProduct.minStock),
    below_min: quantity <= fallbackProduct.minStock,
  }
  stockItems = [...stockItems, row]
  return row
}

function appendKardexEntry(input: {
  product_id: string
  warehouse_id: string
  reference: string
  type: KardexType
  quantity_in: number
  quantity_out: number
  occurred_at?: string
}) {
  const warehouseId = input.warehouse_id || preferredWarehouseForProduct(input.product_id)
  const warehouse = Object.values(WAREHOUSES).find((candidate) => warehouseRef(candidate.n) === warehouseId)
  const balance = Math.max(
    0,
    (stockItems.find((row) => row.product_id === input.product_id && row.warehouse_id === warehouseId)?.quantity ?? 0),
  )
  const product = Object.values(PRODUCTS).find((candidate) => productRef(candidate.n) === input.product_id)

  const row: KardexRow = {
    id: `00000000-0000-4000-8031-${String(kardexItems.length + 1).padStart(12, "0")}`,
    product_id: input.product_id,
    product_name: product?.name,
    product_sku: product?.sku,
    warehouse_id: warehouseId,
    warehouse_name: warehouse?.name ?? "Almacén",
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    type: input.type,
    reference: input.reference,
    quantity_in: input.quantity_in,
    quantity_out: input.quantity_out,
    balance,
  }

  kardexItems = [row, ...kardexItems]
  return row
}

export function getStockRows() {
  return [...stockItems]
}

export function getKardexEntries() {
  return [...kardexItems]
}

export function getAvailableQuantity(productId: string, warehouseId?: string) {
  expireReservations()
  return stockItems
    .filter((row) => row.product_id === productId && (!warehouseId || row.warehouse_id === warehouseId))
    .reduce((sum, row) => sum + row.quantity, 0)
}

export function applyInventoryMovement({
  product_id,
  warehouse_id,
  quantity,
  direction,
  type,
  reference,
  occurred_at,
}: {
  product_id: string
  warehouse_id?: string
  quantity: number
  direction: "in" | "out"
  type: KardexType
  reference: string
  occurred_at?: string
}) {
  if (quantity <= 0) return { stock: getStockRows(), kardex: getKardexEntries() }

  const targetWarehouse = warehouse_id || preferredWarehouseForProduct(product_id)
  const current = findMatchingStockRow(product_id, targetWarehouse)
  const currentQty = current?.quantity ?? 0
  const nextQty = direction === "in" ? currentQty + quantity : Math.max(0, currentQty - quantity)

  const updatedRow = upsertStockRow(product_id, targetWarehouse, nextQty)
  appendKardexEntry({
    product_id,
    warehouse_id: targetWarehouse,
    reference,
    type,
    quantity_in: direction === "in" ? quantity : 0,
    quantity_out: direction === "out" ? quantity : 0,
    occurred_at,
  })

  return { stock: getStockRows(), kardex: getKardexEntries(), row: updatedRow }
}

export function resetInventoryState() {
  stockItems = [...stockSeed]
  kardexItems = [...kardexSeed]
  reservationItems = []
}
