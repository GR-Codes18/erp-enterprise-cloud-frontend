import { z } from "zod"
import type { StatusTone } from "@/shared/components/StatusBadge"
import { DUPLICATE_PRODUCTS_MESSAGE, hasDuplicateProducts } from "@/shared/lib/lines"
import { pendingQuantity } from "../orders/schema"

export const RECEPTION_STATUSES = ["draft", "confirmed"] as const
export type ReceptionStatus = (typeof RECEPTION_STATUSES)[number]

/** Inmutable al confirmar: un error se corrige con una devolución */
export const RECEPTION_TRANSITIONS: Record<ReceptionStatus, ReceptionStatus[]> = {
  draft: ["confirmed"],
  confirmed: [],
}

export const RECEPTION_STATUS_LABELS: Record<ReceptionStatus, string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
}

export const RECEPTION_STATUS_TONES: Record<ReceptionStatus, StatusTone> = {
  draft: "neutral",
  confirmed: "success",
}

export function canTransitionReception(from: ReceptionStatus, to: ReceptionStatus): boolean {
  return RECEPTION_TRANSITIONS[from].includes(to)
}

const receptionLineSchema = z.object({
  product_id: z.string().min(1, "Selecciona un producto"),
  quantity: z
    .number({ message: "Ingresa una cantidad válida" })
    .int("La cantidad debe ser entera")
    .positive("La cantidad debe ser mayor que cero"),
})

export const receptionInputSchema = z.object({
  order_id: z.string().min(1, "Selecciona la orden de compra"),
  warehouse_id: z.string().min(1, "Selecciona el almacén"),
  guide_number: z.string().trim().min(3, "Ingresa el número de guía de remisión").max(30, "Máximo 30 caracteres"),
  items: z
    .array(receptionLineSchema)
    .min(1, "Agrega al menos un producto")
    .refine((lines) => !hasDuplicateProducts(lines), DUPLICATE_PRODUCTS_MESSAGE),
})

export type ReceptionInput = z.infer<typeof receptionInputSchema>

export const receptionSchema = z.object({
  id: z.string(),
  number: z.string(),
  order_id: z.string(),
  order_number: z.string(),
  supplier_name: z.string(),
  warehouse_id: z.string(),
  warehouse_name: z.string(),
  guide_number: z.string(),
  /** returned_quantity: lo ya devuelto al proveedor en devoluciones confirmadas */
  items: z.array(receptionLineSchema.extend({ product_name: z.string(), returned_quantity: z.number() })),
  status: z.enum(RECEPTION_STATUSES),
  created_at: z.string(),
})

export type Reception = z.infer<typeof receptionSchema>

/** Cantidad recibida <= pendiente de la orden. Mensaje por línea (undefined si está bien) */
export function receptionQuantityErrors(
  items: readonly { product_id: string; quantity: number }[],
  orderLines: readonly { product_id: string; quantity: number; received_quantity: number }[],
): (string | undefined)[] {
  return items.map((item) => {
    const line = orderLines.find((candidate) => candidate.product_id === item.product_id)
    if (!line) return "El producto no está en la orden"
    const pending = pendingQuantity(line)
    return item.quantity > pending ? `Solo quedan ${pending} unidades pendientes` : undefined
  })
}
