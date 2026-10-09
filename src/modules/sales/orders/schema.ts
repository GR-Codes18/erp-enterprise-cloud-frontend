import { z } from "zod"
import type { StatusTone } from "@/shared/components/StatusBadge"
import { EMPTY_LINE, documentLinesSchema } from "@/shared/lib/lines"
import { notesSchema } from "@/shared/lib/schemas"

export const ORDER_STATUSES = ["draft", "confirmed", "invoiced", "cancelled"] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** En v1 un pedido genera un solo comprobante: al emitirlo pasa a "invoiced". Cancelar solo antes */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["invoiced", "cancelled"],
  invoiced: [],
  cancelled: [],
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Borrador",
  confirmed: "Confirmado",
  invoiced: "Facturado",
  cancelled: "Cancelado",
}

export const ORDER_STATUS_TONES: Record<OrderStatus, StatusTone> = {
  draft: "neutral",
  confirmed: "warning",
  invoiced: "success",
  cancelled: "danger",
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to)
}

export const PAYMENT_CONDITIONS = ["cash", "credit"] as const
export type PaymentCondition = (typeof PAYMENT_CONDITIONS)[number]

export const PAYMENT_CONDITION_LABELS: Record<PaymentCondition, string> = {
  cash: "Contado",
  credit: "Crédito",
}

export const MAX_CREDIT_DAYS = 365

export const orderInputSchema = z
  .object({
    customer_id: z.string().min(1, "Selecciona un cliente"),
    /** Cotización de origen, o "" si el pedido se creó directo */
    quote_id: z.string(),
    items: documentLinesSchema,
    payment_condition: z.enum(PAYMENT_CONDITIONS),
    credit_days: z
      .number({ message: "Ingresa los días de crédito" })
      .int("Los días de crédito deben ser un número entero")
      .min(0, "Los días de crédito no pueden ser negativos")
      .max(MAX_CREDIT_DAYS, `Máximo ${MAX_CREDIT_DAYS} días`),
    notes: notesSchema,
  })
  .superRefine((order, ctx) => {
    if (order.payment_condition === "credit" && order.credit_days < 1) {
      ctx.addIssue({ code: "custom", path: ["credit_days"], message: "Un pedido a crédito necesita al menos 1 día de plazo" })
    }
    if (order.payment_condition === "cash" && order.credit_days !== 0) {
      ctx.addIssue({ code: "custom", path: ["credit_days"], message: "Un pedido al contado no tiene días de crédito" })
    }
  })

export type OrderInput = z.infer<typeof orderInputSchema>

const orderLineSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  quantity: z.number(),
  unit_price: z.string(),
})

export const orderSchema = z.object({
  id: z.string(),
  /** Correlativo que asigna el backend, ej. "PED-000008" */
  number: z.string(),
  customer_id: z.string(),
  customer_name: z.string(),
  /** Para saber si se puede emitir factura (exige RUC) */
  customer_document_type: z.enum(["DNI", "RUC", "CE"]),
  quote_id: z.string(),
  quote_number: z.string(),
  items: z.array(orderLineSchema),
  payment_condition: z.enum(PAYMENT_CONDITIONS),
  credit_days: z.number(),
  notes: z.string(),
  status: z.enum(ORDER_STATUSES),
  subtotal: z.string(),
  igv: z.string(),
  total: z.string(),
  /** Comprobante emitido desde el pedido ("" si aún no se emite) */
  invoice_id: z.string(),
  cancel_reason: z.string(),
  created_at: z.string(),
})

export type Order = z.infer<typeof orderSchema>

export const EMPTY_ORDER: OrderInput = {
  customer_id: "",
  quote_id: "",
  items: [{ ...EMPTY_LINE }],
  payment_condition: "cash",
  credit_days: 0,
  notes: "",
}

export function toOrderInput(order: Order): OrderInput {
  return {
    customer_id: order.customer_id,
    quote_id: order.quote_id,
    items: order.items.map(({ product_id, quantity, unit_price }) => ({ product_id, quantity, unit_price })),
    payment_condition: order.payment_condition,
    credit_days: order.credit_days,
    notes: order.notes,
  }
}
