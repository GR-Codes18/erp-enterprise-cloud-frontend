import { z } from "zod"
import type { StatusTone } from "@/shared/components/StatusBadge"
import { DUPLICATE_PRODUCTS_MESSAGE, hasDuplicateProducts } from "@/shared/lib/lines"
import { reasonSchema } from "@/shared/lib/reasonSchema"

export const RETURN_STATUSES = ["draft", "confirmed"] as const
export type ReturnStatus = (typeof RETURN_STATUSES)[number]

export const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  draft: ["confirmed"],
  confirmed: [],
}

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
}

export const RETURN_STATUS_TONES: Record<ReturnStatus, StatusTone> = {
  draft: "neutral",
  confirmed: "success",
}

export function canTransitionReturn(from: ReturnStatus, to: ReturnStatus): boolean {
  return RETURN_TRANSITIONS[from].includes(to)
}

const returnLineSchema = z.object({
  product_id: z.string().min(1, "Selecciona un producto"),
  condition: z.enum(["good", "damaged"]).default("good"),
  quantity: z
    .number({ message: "Ingresa una cantidad válida" })
    .int("La cantidad debe ser entera")
    .positive("La cantidad debe ser mayor que cero"),
})

export const returnInputSchema = z.object({
  invoice_id: z.string().min(1, "Selecciona el comprobante"),
  items: z
    .array(returnLineSchema)
    .min(1, "Agrega al menos un producto")
    .refine((lines) => !hasDuplicateProducts(lines), DUPLICATE_PRODUCTS_MESSAGE),
  /** Motivo obligatorio: es lo que revisa la auditoría */
  reason: reasonSchema.shape.reason,
})

export type ReturnInput = z.infer<typeof returnInputSchema>
export type ReturnFormValues = z.input<typeof returnInputSchema>

export const salesReturnSchema = z.object({
  id: z.string(),
  /** Correlativo que asigna el backend, ej. "DEV-000003" */
  number: z.string(),
  invoice_id: z.string(),
  invoice_code: z.string(),
  customer_name: z.string(),
  items: z.array(returnLineSchema.extend({ product_name: z.string(), unit_price: z.string() })),
  reason: z.string(),
  status: z.enum(RETURN_STATUSES),
  /** Monto de la nota de crédito que genera (lo calcula el backend) */
  total: z.string(),
  created_at: z.string(),
})

export type SalesReturn = z.infer<typeof salesReturnSchema>

export const EMPTY_RETURN: ReturnFormValues = {
  invoice_id: "",
  items: [],
  reason: "",
}

/** Línea del comprobante con lo que aún se puede devolver */
export interface ReturnableLine {
  product_id: string
  quantity: number
  returned_quantity: number
}

/** Unidades que todavía se pueden devolver: vendidas menos ya devueltas */
export const returnableQuantity = (line: ReturnableLine) => Math.max(0, line.quantity - line.returned_quantity)

/**
 * Cantidad devuelta <= vendida menos lo ya devuelto. Devuelve el mensaje de error por línea
 * (undefined si está bien). El backend vuelve a validar al confirmar.
 */
export function returnQuantityErrors(
  items: readonly { product_id: string; quantity: number }[],
  invoiceLines: readonly ReturnableLine[],
): (string | undefined)[] {
  return items.map((item) => {
    const line = invoiceLines.find((candidate) => candidate.product_id === item.product_id)
    if (!line) return "El producto no está en el comprobante"
    const available = returnableQuantity(line)
    return item.quantity > available ? `Solo se pueden devolver ${available} unidades` : undefined
  })
}
