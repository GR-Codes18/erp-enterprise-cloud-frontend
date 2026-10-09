import { z } from "zod"
import type { StatusTone } from "@/shared/components/StatusBadge"
import { DUPLICATE_PRODUCTS_MESSAGE, hasDuplicateProducts } from "@/shared/lib/lines"
import { reasonSchema } from "@/shared/lib/reasonSchema"

export const PURCHASE_RETURN_STATUSES = ["draft", "confirmed"] as const
export type PurchaseReturnStatus = (typeof PURCHASE_RETURN_STATUSES)[number]

export const PURCHASE_RETURN_TRANSITIONS: Record<PurchaseReturnStatus, PurchaseReturnStatus[]> = {
  draft: ["confirmed"],
  confirmed: [],
}

export const PURCHASE_RETURN_STATUS_LABELS: Record<PurchaseReturnStatus, string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
}

export const PURCHASE_RETURN_STATUS_TONES: Record<PurchaseReturnStatus, StatusTone> = {
  draft: "neutral",
  confirmed: "success",
}

export function canTransitionPurchaseReturn(from: PurchaseReturnStatus, to: PurchaseReturnStatus): boolean {
  return PURCHASE_RETURN_TRANSITIONS[from].includes(to)
}

const lineSchema = z.object({
  product_id: z.string().min(1, "Selecciona un producto"),
  quantity: z
    .number({ message: "Ingresa una cantidad válida" })
    .int("La cantidad debe ser entera")
    .positive("La cantidad debe ser mayor que cero"),
})

/** Devolución al proveedor contra una recepción confirmada: cantidad <= recibida, motivo obligatorio */
export const purchaseReturnInputSchema = z.object({
  reception_id: z.string().min(1, "Selecciona la recepción"),
  items: z
    .array(lineSchema)
    .min(1, "Agrega al menos un producto")
    .refine((lines) => !hasDuplicateProducts(lines), DUPLICATE_PRODUCTS_MESSAGE),
  reason: reasonSchema.shape.reason,
})

export type PurchaseReturnInput = z.infer<typeof purchaseReturnInputSchema>
export type PurchaseReturnFormValues = z.input<typeof purchaseReturnInputSchema>

export const purchaseReturnSchema = z.object({
  id: z.string(),
  number: z.string(),
  reception_id: z.string(),
  reception_number: z.string(),
  supplier_name: z.string(),
  items: z.array(lineSchema.extend({ product_name: z.string(), unit_price: z.string() })),
  reason: z.string(),
  status: z.enum(PURCHASE_RETURN_STATUSES),
  /** Lo que se deja de deber al proveedor: lo calcula el backend */
  total: z.string(),
  created_at: z.string(),
})

export type PurchaseReturn = z.infer<typeof purchaseReturnSchema>

export const EMPTY_PURCHASE_RETURN: PurchaseReturnFormValues = { reception_id: "", items: [], reason: "" }

/** Cantidad devuelta <= recibida (menos lo ya devuelto). Mensaje por línea */
export function purchaseReturnQuantityErrors(
  items: readonly { product_id: string; quantity: number }[],
  receptionLines: readonly { product_id: string; quantity: number; returned_quantity: number }[],
): (string | undefined)[] {
  return items.map((item) => {
    const line = receptionLines.find((candidate) => candidate.product_id === item.product_id)
    if (!line) return "El producto no está en la recepción"
    const available = Math.max(0, line.quantity - line.returned_quantity)
    return item.quantity > available ? `Solo se pueden devolver ${available} unidades` : undefined
  })
}
