import { createDocumentHandlers, nextNumber } from "@/mocks/utils/documents"
import { applyInventoryMovement, getAvailableQuantity } from "@/modules/inventory/state"
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
    number: "TR-000003",
    origin_warehouse_id: warehouseRef(2),
    origin_warehouse_name: WAREHOUSES.rawMaterial.name,
    destination_warehouse_id: warehouseRef(1),
    destination_warehouse_name: WAREHOUSES.central.name,
    items: [{ product_id: productRef(3), product_name: PRODUCTS.cement.name, quantity: 10 }],
    status: "draft",
    cancel_reason: "",
    created_at: "2026-10-06T15:00:00Z",
  },
  {
    id: uuid(2),
    number: "TR-000002",
    origin_warehouse_id: warehouseRef(1),
    origin_warehouse_name: WAREHOUSES.central.name,
    destination_warehouse_id: warehouseRef(3),
    destination_warehouse_name: WAREHOUSES.finished.name,
    items: [{ product_id: productRef(1), product_name: PRODUCTS.hammer.name, quantity: 5 }],
    status: "in_transit",
    cancel_reason: "",
    created_at: "2026-10-05T15:00:00Z",
  },
  {
    id: uuid(3),
    number: "TR-000001",
    origin_warehouse_id: warehouseRef(3),
    origin_warehouse_name: WAREHOUSES.finished.name,
    destination_warehouse_id: warehouseRef(1),
    destination_warehouse_name: WAREHOUSES.central.name,
    items: [{ product_id: productRef(7), product_name: PRODUCTS.paint.name, quantity: 3 }],
    status: "received",
    cancel_reason: "",
    created_at: "2026-10-01T15:00:00Z",
  },
]

function makeTransfer(input: TransferInput, id: string, created_at: string, number: string): Transfer {
  return {
    ...input,
    id,
    number,
    origin_warehouse_name: warehouseName(input.origin_warehouse_id),
    destination_warehouse_name: warehouseName(input.destination_warehouse_id),
    items: input.items.map((item) => ({ ...item, product_name: productName(item.product_id) })),
    status: "draft",
    cancel_reason: "",
    created_at,
  }
}

let transferCounter = seed.length

export const { handlers: transferHandlers } = createDocumentHandlers<Transfer, TransferInput, Transfer["status"]>({
  resource: "inventory/transfers",
  seed,
  searchFields: ["number", "origin_warehouse_name", "destination_warehouse_name"],
  filterFields: ["status", "origin_warehouse_id", "destination_warehouse_id"],
  dateField: "created_at",
  inputSchema: transferInputSchema,
  actions: [
    {
      action: "send",
      from: ["draft"],
      to: "in_transit",
      check: (transfer) => {
        const shortages = transfer.items.flatMap((item) => {
          const available = getAvailableQuantity(item.product_id, transfer.origin_warehouse_id)
          return item.quantity > available
            ? [`${productName(item.product_id)} (disponible ${available}, transferencia ${item.quantity})`]
            : []
        })
        if (shortages.length > 0) {
          return { status: 409, code: "INSUFFICIENT_STOCK", message: `Stock insuficiente en origen: ${shortages.join("; ")}.` }
        }
        return undefined
      },
      respond: (transfer) => {
        transfer.items.forEach((item) => {
          applyInventoryMovement({
            product_id: item.product_id,
            warehouse_id: transfer.origin_warehouse_id,
            quantity: item.quantity,
            direction: "out",
            type: "transfer_out",
            reference: transfer.number,
          })
        })
        return transfer
      },
    },
    {
      action: "receive",
      from: ["in_transit"],
      to: "received",
      respond: (transfer) => {
        transfer.items.forEach((item) => {
          applyInventoryMovement({
            product_id: item.product_id,
            warehouse_id: transfer.destination_warehouse_id,
            quantity: item.quantity,
            direction: "in",
            type: "transfer_in",
            reference: transfer.number,
          })
        })
        return transfer
      },
    },
    {
      action: "cancel",
      from: ["draft"],
      to: "cancelled",
      requiresReason: true,
      apply: (_transfer, body) => ({ cancel_reason: String(body.reason).trim() }),
    },
  ],
  // Contador propio: borrar un borrador no reutiliza su número
  createRecord: (input, id, createdAt) => makeTransfer(input, id, createdAt, nextNumber("TR", ++transferCounter)),
  updateRecord: (current, input) => makeTransfer(input, current.id, current.created_at, current.number),
})
