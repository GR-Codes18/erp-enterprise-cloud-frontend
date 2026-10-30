import { z } from "zod"
import type { StatusTone } from "@/shared/components/StatusBadge"
import { EMPTY_LINE } from "@/shared/lib/lines"
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

export const SALE_TYPES = ["unit", "wholesale"] as const
export type SaleType = (typeof SALE_TYPES)[number]

export const SALE_TYPE_LABELS: Record<SaleType, string> = {
  unit: "Por unidad / presencial",
  wholesale: "Al por mayor",
}

export const DELIVERY_METHODS = ["none", "shipping", "pickup"] as const
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number]

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  none: "Presencial",
  shipping: "Envío",
  pickup: "Recojo",
}

export const DELIVERY_STATUSES = [
  "not_required",
  "pending",
  "in_transit",
  "delivered",
  "ready_for_pickup",
  "picked_up",
] as const
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

export function getNextDeliveryStatus(method: DeliveryMethod, status: DeliveryStatus): DeliveryStatus | null {
  if (method === "shipping") {
    if (status === "pending") return "in_transit"
    if (status === "in_transit") return "delivered"
  }
  if (method === "pickup") {
    if (status === "pending") return "ready_for_pickup"
    if (status === "ready_for_pickup") return "picked_up"
  }
  return null
}

export function getDeliveryStatusLabel(method: DeliveryMethod, status: DeliveryStatus): string {
  if (method === "shipping") {
    if (status === "pending") return "Pendiente de envío"
    if (status === "in_transit") return "En camino"
    if (status === "delivered") return "Entregado"
  }
  if (method === "pickup") {
    if (status === "pending") return "Pendiente de recojo"
    if (status === "ready_for_pickup") return "Listo para recojo"
    if (status === "picked_up") return "Recogido"
  }
  return "No requiere entrega"
}

export const deliveryStatusInputSchema = z.object({
  status: z.enum(DELIVERY_STATUSES),
})

export const MAX_CREDIT_DAYS = 365

const orderLineInputSchema = z.object({
  product_id: z.string().min(1, "Selecciona un producto"),
  warehouse_id: z.string().min(1, "Selecciona un almacén"),
  quantity: z
    .number({ message: "Ingresa una cantidad válida" })
    .int("La cantidad debe ser entera")
    .positive("La cantidad debe ser mayor que cero"),
  unit_price: z
    .string()
    .trim()
    .min(1, "Ingresa el precio")
    .regex(/^\d+(\.\d{1,2})?$/, "Precio no válido, ejemplo: 45.50"),
})

const BUYER_DOCUMENT_TYPES = ["DNI", "RUC", "CE"] as const

export const orderInputSchema = z
  .object({
    customer_id: z.string(),
    buyer_name: z.string().trim().max(150, "El nombre no puede superar 150 caracteres"),
    buyer_document_type: z.union([z.enum(BUYER_DOCUMENT_TYPES), z.literal("")]),
    buyer_document_number: z.string().trim().max(20, "El documento no puede superar 20 caracteres"),
    sale_type: z.enum(SALE_TYPES),
    delivery_method: z.enum(DELIVERY_METHODS),
    /** Cotización de origen, o "" si el pedido se creó directo */
    quote_id: z.string(),
    items: z.array(orderLineInputSchema).min(1, "Agrega al menos un producto"),
    payment_condition: z.enum(PAYMENT_CONDITIONS),
    credit_days: z
      .number({ message: "Ingresa los días de crédito" })
      .int("Los días de crédito deben ser un número entero")
      .min(0, "Los días de crédito no pueden ser negativos")
      .max(MAX_CREDIT_DAYS, `Máximo ${MAX_CREDIT_DAYS} días`),
    notes: notesSchema,
  })
  .superRefine((order, ctx) => {
    if (!order.customer_id) {
      if (order.sale_type !== "unit" || order.payment_condition !== "cash" || order.delivery_method !== "none" || order.quote_id) {
        ctx.addIssue({
          code: "custom",
          path: ["customer_id"],
          message: "Selecciona un cliente para ventas al por mayor, a crédito, con envío o desde cotización",
        })
      }

      const hasBuyerName = order.buyer_name.trim() !== ""
      const hasDocumentType = order.buyer_document_type !== ""
      const hasDocumentNumber = order.buyer_document_number.trim() !== ""
      if (!hasBuyerName && !(hasDocumentType && hasDocumentNumber)) {
        ctx.addIssue({
          code: "custom",
          path: ["buyer_name"],
          message: "Ingresa el nombre o el tipo y número de documento del comprador para la boleta",
        })
      }
      if (hasDocumentType !== hasDocumentNumber) {
        ctx.addIssue({
          code: "custom",
          path: hasDocumentType ? ["buyer_document_number"] : ["buyer_document_type"],
          message: "Completa el tipo y número de documento",
        })
      }
    }
    if (order.sale_type === "unit" && order.delivery_method !== "none") {
      ctx.addIssue({
        code: "custom",
        path: ["delivery_method"],
        message: "Una venta por unidad es presencial",
      })
    }
    if (order.sale_type === "wholesale" && order.delivery_method === "none") {
      ctx.addIssue({
        code: "custom",
        path: ["delivery_method"],
        message: "Selecciona envío o recojo para una venta al por mayor",
      })
    }
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
  warehouse_id: z.string(),
  warehouse_name: z.string(),
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
  buyer_name: z.string().default(""),
  buyer_document_type: z.union([z.enum(BUYER_DOCUMENT_TYPES), z.literal("")]).default(""),
  buyer_document_number: z.string().default(""),
  quote_id: z.string(),
  quote_number: z.string(),
  items: z.array(orderLineSchema),
  payment_condition: z.enum(PAYMENT_CONDITIONS),
  sale_type: z.enum(SALE_TYPES).default("unit"),
  delivery_method: z.enum(DELIVERY_METHODS).default("none"),
  delivery_status: z.enum(DELIVERY_STATUSES).default("not_required"),
  delivery_address: z.string().default(""),
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
  buyer_name: "",
  buyer_document_type: "",
  buyer_document_number: "",
  sale_type: "unit",
  delivery_method: "none",
  quote_id: "",
  items: [{ ...EMPTY_LINE, warehouse_id: "" }],
  payment_condition: "cash",
  credit_days: 0,
  notes: "",
}

export function toOrderInput(order: Order): OrderInput {
  return {
    customer_id: order.customer_id,
    buyer_name: order.buyer_name,
    buyer_document_type: order.buyer_document_type,
    buyer_document_number: order.buyer_document_number,
    sale_type: order.sale_type,
    delivery_method: order.delivery_method,
    quote_id: order.quote_id,
    items: order.items.map(({ product_id, warehouse_id, quantity, unit_price }) => ({ product_id, warehouse_id, quantity, unit_price })),
    payment_condition: order.payment_condition,
    credit_days: order.credit_days,
    notes: order.notes,
  }
}
