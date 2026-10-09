import { z } from "zod"
import type { StatusTone } from "@/shared/components/StatusBadge"

export const STOCK_STATUSES = ["normal", "low", "out"] as const
export type StockStatus = (typeof STOCK_STATUSES)[number]

export const STATUS_LABELS: Record<StockStatus, string> = {
  normal: "Normal",
  low: "Bajo",
  out: "Sin stock",
}

/** El estado siempre se comunica con texto; el color solo lo refuerza */
export const STATUS_TONES: Record<StockStatus, StatusTone> = {
  normal: "success",
  low: "warning",
  out: "danger",
}

/**
 * Una fila del stock: un producto en un almacén. Solo lectura: el stock nunca se edita directamente,
 * solo cambia por movimientos (compra, venta, transferencia, ajuste, devolución).
 * El estado y la cantidad los calcula el backend; el frontend no suma ni compara.
 */
export const stockRowSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  product_sku: z.string(),
  product_name: z.string(),
  category_id: z.string(),
  category_name: z.string(),
  warehouse_id: z.string(),
  warehouse_name: z.string(),
  unit: z.string(),
  quantity: z.number().int().nonnegative(),
  min_stock: z.number().int().nonnegative(),
  status: z.enum(STOCK_STATUSES),
  /** quantity <= min_stock (incluye "Sin stock"). Lo calcula el backend */
  below_min: z.boolean(),
})

export type StockRow = z.infer<typeof stockRowSchema>

/** Valor centinela de los filtros "todos": Radix Select no admite cadenas vacías como valor */
export const FILTER_ALL = "all"

/** Solo viajan al backend los filtros que la persona realmente eligió */
export function buildStockFilters({
  below_min,
  ...values
}: {
  status: string
  warehouse_id: string
  category_id: string
  /** "Solo bajo mínimo": productos con stock <= mínimo, incluidos los que no tienen stock */
  below_min?: boolean
}): Record<string, string> {
  const filters: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) {
    if (value !== FILTER_ALL && value !== "") filters[key] = value
  }
  if (below_min) filters.below_min = "true"
  return filters
}