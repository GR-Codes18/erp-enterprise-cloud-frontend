import { z } from "zod"
import type { StatusTone } from "@/shared/components/StatusBadge"
import { EMPTY_LINE, documentLinesSchema } from "@/shared/lib/lines"
import { businessDateSchema, notesSchema } from "@/shared/lib/schemas"

export const PURCHASE_ORDER_STATUSES = ["draft", "issued", "partially_received", "received", "cancelled"] as const
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number]

/** Las recepciones avanzan issued → partially_received → received. Solo se cancela sin recepciones */
export const PURCHASE_ORDER_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ["issued", "cancelled"],
  issued: ["partially_received", "received", "cancelled"],
  partially_received: ["received"],
  received: [],
  cancelled: [],
}

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: "Borrador",
  issued: "Emitida",
  partially_received: "Recepción parcial",
  received: "Recibida",
  cancelled: "Cancelada",
}

export const PURCHASE_ORDER_STATUS_TONES: Record<PurchaseOrderStatus, StatusTone> = {
  draft: "neutral",
  issued: "warning",
  partially_received: "warning",
  received: "success",
  cancelled: "danger",
}

export function canTransitionPurchaseOrder(from: PurchaseOrderStatus, to: PurchaseOrderStatus): boolean {
  return PURCHASE_ORDER_TRANSITIONS[from].includes(to)
}

export const purchaseOrderInputSchema = z.object({
  supplier_id: z.string().min(1, "Selecciona un proveedor"),
  /** Solicitud aprobada de origen, o "" si la orden se crea directo */
  request_id: z.string(),
  /** unit_price es el costo unitario pactado con el proveedor */
  items: documentLinesSchema,
  expected_date: businessDateSchema("Ingresa la fecha esperada de entrega"),
  notes: notesSchema,
})

export type PurchaseOrderInput = z.infer<typeof purchaseOrderInputSchema>

export const purchaseOrderSchema = z.object({
  id: z.string(),
  number: z.string(),
  supplier_id: z.string(),
  supplier_name: z.string(),
  request_id: z.string(),
  request_number: z.string(),
  items: z.array(
    z.object({
      product_id: z.string(),
      product_name: z.string(),
      quantity: z.number(),
      unit_price: z.string(),
      /** Lo recibido en recepciones confirmadas (lo actualiza el backend) */
      received_quantity: z.number(),
    }),
  ),
  expected_date: z.string(),
  notes: z.string(),
  status: z.enum(PURCHASE_ORDER_STATUSES),
  subtotal: z.string(),
  igv: z.string(),
  total: z.string(),
  cancel_reason: z.string(),
  created_at: z.string(),
})

export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>

export function emptyPurchaseOrder(expectedDate: string): PurchaseOrderInput {
  return { supplier_id: "", request_id: "", items: [{ ...EMPTY_LINE }], expected_date: expectedDate, notes: "" }
}

export function toPurchaseOrderInput(order: PurchaseOrder): PurchaseOrderInput {
  return {
    supplier_id: order.supplier_id,
    request_id: order.request_id,
    items: order.items.map(({ product_id, quantity, unit_price }) => ({ product_id, quantity, unit_price })),
    expected_date: order.expected_date,
    notes: order.notes,
  }
}

/** Cancelar solo si aún no se recibió nada */
export function canCancelPurchaseOrder(order: Pick<PurchaseOrder, "status" | "items">): boolean {
  return (
    canTransitionPurchaseOrder(order.status, "cancelled") && order.items.every((item) => item.received_quantity === 0)
  )
}

/** Unidades pendientes de recibir de una línea */
export const pendingQuantity = (line: { quantity: number; received_quantity: number }) =>
  Math.max(0, line.quantity - line.received_quantity)

/** Se puede registrar una recepción mientras la orden esté emitida o parcialmente recibida */
export const canReceive = (order: Pick<PurchaseOrder, "status">) =>
  order.status === "issued" || order.status === "partially_received"
