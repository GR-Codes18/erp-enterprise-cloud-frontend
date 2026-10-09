import { z } from "zod"
import { toCents } from "@/shared/lib/money"
import { calculateTotals, type IgvTotals } from "@/shared/lib/tax"

/** Precio o costo unitario: texto decimal >= 0 con máximo 2 decimales ("45.50", "45.5", "45") */
export const UNIT_PRICE_PATTERN = /^\d+(\.\d{1,2})?$/

export const DUPLICATE_PRODUCTS_MESSAGE = "No repitas productos; consolida las cantidades en una sola línea"

/** Una línea de documento con precio (cotización, pedido, orden de compra...) */
export const documentLineSchema = z.object({
  product_id: z.string().min(1, "Selecciona un producto"),
  quantity: z
    .number({ message: "Ingresa una cantidad válida" })
    .int("La cantidad debe ser entera")
    .positive("La cantidad debe ser mayor que cero"),
  unit_price: z
    .string()
    .trim()
    .min(1, "Ingresa el precio")
    .regex(UNIT_PRICE_PATTERN, "Precio no válido, ejemplo: 45.50"),
})

export type DocumentLine = z.infer<typeof documentLineSchema>

/** Una lista de líneas con al menos una y sin productos repetidos */
export const documentLinesSchema = z
  .array(documentLineSchema)
  .min(1, "Agrega al menos un producto")
  .refine((lines) => !hasDuplicateProducts(lines), DUPLICATE_PRODUCTS_MESSAGE)

export function hasDuplicateProducts(lines: readonly { product_id: string }[]): boolean {
  const ids = lines.map((line) => line.product_id).filter(Boolean)
  return new Set(ids).size !== ids.length
}

export const EMPTY_LINE: DocumentLine = { product_id: "", quantity: 1, unit_price: "" }

/** Subtotal de una línea en centavos (cantidad × precio). null si aún no es válida */
export function lineSubtotalCents(line: { quantity: number; unit_price: string }): number | null {
  if (!Number.isInteger(line.quantity) || line.quantity <= 0) return null
  const price = line.unit_price.trim()
  if (!UNIT_PRICE_PATTERN.test(price)) return null
  return toCents(price) * line.quantity
}

/**
 * Vista previa de los totales: subtotal, IGV (sobre el subtotal, una sola vez) y total, en centavos.
 * Ignora las líneas incompletas. Los totales oficiales los devuelve el backend y mandan si difieren.
 */
export function previewTotals(lines: readonly { quantity: number; unit_price: string }[]): IgvTotals {
  const subtotal = lines.reduce((sum, line) => sum + (lineSubtotalCents(line) ?? 0), 0)
  return calculateTotals(subtotal)
}
