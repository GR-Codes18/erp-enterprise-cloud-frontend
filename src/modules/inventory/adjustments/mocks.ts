import { createDocumentHandlers, nextNumber } from "@/mocks/utils/documents"
import { applyInventoryMovement } from "@/modules/inventory/state"
import { PRODUCTS, WAREHOUSES, productRef, warehouseRef } from "../mockRefs"
import type { Adjustment, AdjustmentInput } from "./schema"
import { adjustmentInputSchema } from "./schema"

const uuid = (n: number) => `00000000-0000-4000-8033-${String(n).padStart(12, "0")}`
const productName = (id: string) =>
  Object.values(PRODUCTS).find((product) => productRef(product.n) === id)?.name ?? id
const warehouseName = (id: string) =>
  Object.values(WAREHOUSES).find((warehouse) => warehouseRef(warehouse.n) === id)?.name ?? id

const seed: Adjustment[] = [
  {
    id: uuid(1),
    number: "AJ-000003",
    warehouse_id: warehouseRef(1),
    warehouse_name: WAREHOUSES.central.name,
    items: [{ product_id: productRef(9), product_name: PRODUCTS.cable.name, direction: "decrease", quantity: 5 }],
    reason: "physical_count",
    notes: "Diferencia detectada durante el conteo semanal.",
    status: "draft",
    created_at: "2026-10-07T15:00:00Z",
  },
  {
    id: uuid(2),
    number: "AJ-000002",
    warehouse_id: warehouseRef(3),
    warehouse_name: WAREHOUSES.finished.name,
    items: [{ product_id: productRef(7), product_name: PRODUCTS.paint.name, direction: "increase", quantity: 3 }],
    reason: "physical_count",
    notes: "Regularización de inventario.",
    status: "applied",
    created_at: "2026-10-03T15:00:00Z",
  },
  {
    id: uuid(3),
    number: "AJ-000001",
    warehouse_id: warehouseRef(2),
    warehouse_name: WAREHOUSES.rawMaterial.name,
    items: [{ product_id: productRef(3), product_name: PRODUCTS.cement.name, direction: "decrease", quantity: 2 }],
    reason: "damage",
    notes: "",
    status: "applied",
    created_at: "2026-10-01T15:00:00Z",
  },
]

function makeAdjustment(input: AdjustmentInput, id: string, created_at: string, number: string): Adjustment {
  return {
    ...input,
    id,
    number,
    warehouse_name: warehouseName(input.warehouse_id),
    items: input.items.map((item) => ({ ...item, product_name: productName(item.product_id) })),
    status: "draft",
    created_at,
  }
}

let adjustmentCounter = seed.length

export const { handlers: adjustmentHandlers } = createDocumentHandlers<
  Adjustment,
  AdjustmentInput,
  Adjustment["status"]
>({
  resource: "inventory/adjustments",
  seed,
  searchFields: ["number", "warehouse_name"],
  filterFields: ["status", "warehouse_id", "reason"],
  dateField: "created_at",
  inputSchema: adjustmentInputSchema,
  actions: [
    {
      action: "apply",
      from: ["draft"],
      to: "applied",
      respond: (adjustment) => {
        adjustment.items.forEach((item) => {
          applyInventoryMovement({
            product_id: item.product_id,
            warehouse_id: adjustment.warehouse_id,
            quantity: item.quantity,
            direction: item.direction === "increase" ? "in" : "out",
            type: "adjustment",
            reference: adjustment.number,
          })
        })
        return adjustment
      },
    },
  ],
  // Contador propio: borrar un borrador no reutiliza su número
  createRecord: (input, id, createdAt) => makeAdjustment(input, id, createdAt, nextNumber("AJ", ++adjustmentCounter)),
  updateRecord: (current, input) => makeAdjustment(input, current.id, current.created_at, current.number),
})
