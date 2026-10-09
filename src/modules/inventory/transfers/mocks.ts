import { createInventoryDocumentHandlers } from "../documentMocks"
import { PRODUCTS, WAREHOUSES, productRef, warehouseRef } from "../mockRefs"
import type { Transfer, TransferInput } from "./schema"
import { transferInputSchema } from "./schema"

const uuid = (n: number) => `00000000-0000-4000-8032-${String(n).padStart(12, "0")}`
const productName = (id: string) =>
  Object.values(PRODUCTS).find((product) => productRef(product.n) === id)?.name ?? id
const warehouseName = (id: string) =>
  Object.values(WAREHOUSES).find((warehouse) => warehouseRef(warehouse.n) === id)?.name ?? id

const seed: Transfer[] = [
  {
    id: uuid(1),
    origin_warehouse_id: warehouseRef(2),
    origin_warehouse_name: WAREHOUSES.rawMaterial.name,
    destination_warehouse_id: warehouseRef(1),
    destination_warehouse_name: WAREHOUSES.central.name,
    items: [{ product_id: productRef(3), product_name: PRODUCTS.cement.name, quantity: 10 }],
    status: "draft",
    created_at: "2026-10-06T15:00:00Z",
  },
  {
    id: uuid(2),
    origin_warehouse_id: warehouseRef(1),
    origin_warehouse_name: WAREHOUSES.central.name,
    destination_warehouse_id: warehouseRef(3),
    destination_warehouse_name: WAREHOUSES.finished.name,
    items: [{ product_id: productRef(1), product_name: PRODUCTS.hammer.name, quantity: 5 }],
    status: "in_transit",
    created_at: "2026-10-05T15:00:00Z",
  },
  {
    id: uuid(3),
    origin_warehouse_id: warehouseRef(3),
    origin_warehouse_name: WAREHOUSES.finished.name,
    destination_warehouse_id: warehouseRef(1),
    destination_warehouse_name: WAREHOUSES.central.name,
    items: [{ product_id: productRef(7), product_name: PRODUCTS.paint.name, quantity: 3 }],
    status: "received",
    created_at: "2026-10-01T15:00:00Z",
  },
]

function makeTransfer(input: TransferInput, id: string, created_at: string): Transfer {
  return {
    ...input,
    id,
    origin_warehouse_name: warehouseName(input.origin_warehouse_id),
    destination_warehouse_name: warehouseName(input.destination_warehouse_id),
    items: input.items.map((item) => ({ ...item, product_name: productName(item.product_id) })),
    status: "draft",
    created_at,
  }
}

export const transferHandlers = createInventoryDocumentHandlers<Transfer, TransferInput, Transfer["status"]>({
  resource: "inventory/transfers",
  seed,
  searchFields: ["origin_warehouse_name", "destination_warehouse_name"],
  filterFields: ["status", "origin_warehouse_id", "destination_warehouse_id"],
  dateField: "created_at",
  inputSchema: transferInputSchema,
  actions: [
    { action: "send", from: "draft", to: "in_transit" },
    { action: "receive", from: "in_transit", to: "received" },
    { action: "cancel", from: "draft", to: "cancelled" },
  ],
  createRecord: makeTransfer,
  updateRecord: (current, input) => makeTransfer(input, current.id, current.created_at),
})
