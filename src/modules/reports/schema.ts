import { z } from "zod"

/** Reportes operativos: listados con filtros, paginados e imprimibles */
export const OPERATIONAL_REPORTS = ["sales", "purchases", "low-stock"] as const
export type OperationalReport = (typeof OPERATIONAL_REPORTS)[number]

export const OPERATIONAL_REPORT_LABELS: Record<OperationalReport, string> = {
  sales: "Ventas del periodo",
  purchases: "Compras del periodo",
  "low-stock": "Stock bajo mínimo",
}

export const salesReportRowSchema = z.object({
  invoice_id: z.string(),
  code: z.string(),
  type_label: z.string(),
  issue_date: z.string(),
  customer_name: z.string(),
  total: z.string(),
  status_label: z.string(),
})

export const purchasesReportRowSchema = z.object({
  invoice_id: z.string(),
  code: z.string(),
  issue_date: z.string(),
  supplier_name: z.string(),
  total: z.string(),
  status_label: z.string(),
})

export const lowStockRowSchema = z.object({
  product_id: z.string(),
  sku: z.string(),
  product_name: z.string(),
  unit: z.string(),
  stock: z.number(),
  min_stock: z.number(),
  /** Unidades que faltan para llegar al mínimo */
  shortfall: z.number(),
})

export type SalesReportRow = z.infer<typeof salesReportRowSchema>
export type PurchasesReportRow = z.infer<typeof purchasesReportRowSchema>
export type LowStockRow = z.infer<typeof lowStockRowSchema>

/** Listado paginado más el total del periodo (lo suma el backend, no la página) */
export interface ReportPage<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
  /** Suma de montos de todo el resultado (no solo de la página). "" si el reporte no tiene montos */
  sum: string
}

/** Reportes analíticos: series para gráficos */
export const monthlyPointSchema = z.object({
  /** "2026-09" */
  month: z.string(),
  sales: z.string(),
  purchases: z.string(),
})
export type MonthlyPoint = z.infer<typeof monthlyPointSchema>

export const topProductSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  quantity: z.number(),
  amount: z.string(),
})
export type TopProduct = z.infer<typeof topProductSchema>

const MONTH_NAMES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

/** "2026-09" -> "sep 2026" */
export function monthLabel(month: string): string {
  const [year, number] = month.split("-")
  const name = MONTH_NAMES[Number(number) - 1]
  return name ? `${name} ${year}` : month
}

/**
 * Marcas del eje Y: de 0 a un máximo "redondo" (1, 2 o 5 × 10^n) con `count` intervalos.
 * Así el eje siempre empieza en cero y las líneas de guía caen en valores legibles.
 */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0]
  const rough = max / count
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rough) ?? rough
  const top = Math.ceil(max / step) * step
  return Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step)
}
