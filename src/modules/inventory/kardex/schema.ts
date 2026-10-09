import { z } from "zod"

export const KARDEX_TYPES = [
  "purchase",
  "sale",
  "transfer_in",
  "transfer_out",
  "adjustment",
  "return",
] as const
export type KardexType = (typeof KARDEX_TYPES)[number]

export const KARDEX_TYPE_LABELS: Record<KardexType, string> = {
  purchase: "Compra",
  sale: "Venta",
  transfer_in: "Transferencia (entrada)",
  transfer_out: "Transferencia (salida)",
  adjustment: "Ajuste",
  return: "Devolución",
}

/**
 * Un movimiento de inventario. Solo lectura. La dirección la dan las columnas de entrada y salida
 * (un ajuste o una devolución pueden sumar o restar). El saldo es el del producto en ese almacén
 * después del movimiento y lo calcula el backend: el frontend NO suma ni recalcula.
 */
export const kardexRowSchema = z
  .object({
    id: z.string(),
    product_id: z.string(),
    warehouse_id: z.string(),
    warehouse_name: z.string(),
    /** Fecha y hora UTC (ISO 8601). Se muestra con formatDateTimeLima */
    occurred_at: z.string(),
    type: z.enum(KARDEX_TYPES),
    /** Código del documento de origen ("OC-2026-001"). "" si no aplica */
    reference: z.string(),
    quantity_in: z.number().int().nonnegative(),
    quantity_out: z.number().int().nonnegative(),
    balance: z.number().int().nonnegative(),
  })
  .refine((row) => row.quantity_in > 0 !== row.quantity_out > 0, {
    message: "Un movimiento es una entrada o una salida, no ambas ni ninguna",
    path: ["quantity_in"],
  })

export type KardexRow = z.infer<typeof kardexRowSchema>

/** Valor centinela del filtro "todos": Radix Select no admite cadenas vacías como valor */
export const FILTER_ALL = "all"

/** Fechas AAAA-MM-DD. Un extremo vacío no restringe. El backend responde 422 si desde > hasta. */
export function isValidDateRange(from: string, to: string): boolean {
  if (from === "" || to === "") return true
  return from <= to
}

/** El Kardex solo se consulta con un producto y un rango de fechas completo y ordenado */
export function isKardexQueryReady(query: {
  product_id: string
  date_from: string
  date_to: string
}): boolean {
  return (
    query.product_id !== "" &&
    query.date_from !== "" &&
    query.date_to !== "" &&
    isValidDateRange(query.date_from, query.date_to)
  )
}

/** Solo viajan al backend los filtros que la persona realmente eligió */
export function buildKardexFilters(values: {
  product_id: string
  warehouse_id: string
}): Record<string, string> {
  const filters: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) {
    if (value !== FILTER_ALL && value !== "") filters[key] = value
  }
  return filters
}