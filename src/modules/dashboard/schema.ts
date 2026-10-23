import { z } from "zod"

/**
 * Indicadores del Dashboard. Los calcula el backend (definiciones en docs/api-contract.md,
 * sección "Reportes"); el frontend solo los muestra.
 */
export const dashboardSchema = z.object({
  date_from: z.string(),
  date_to: z.string(),
  /** Comprobantes emitidos del periodo, sin anulados y menos devoluciones */
  sales: z.string(),
  /** Facturas de proveedor registradas del periodo (sin anuladas) */
  purchases: z.string(),
  /** Costo actual estimado de los productos vendidos del periodo */
  cost_of_sales: z.string(),
  /** Ventas netas sin IGV menos el costo de lo vendido */
  gross_profit: z.string(),
  /** Utilidad bruta / ventas netas sin IGV, en % con 1 decimal ("25.0"); "" si no hubo ventas */
  gross_margin: z.string(),
  /** Productos con stock <= stock mínimo */
  critical_stock_count: z.number().int().nonnegative(),
  receivables: z.object({ total: z.string(), overdue: z.string() }),
  /** due_soon: lo que vence en los próximos 7 días */
  payables: z.object({ total: z.string(), due_soon: z.string() }),
  /** Costo de ventas / inventario promedio, con 2 decimales ("0.85") */
  inventory_turnover: z.string(),
  alerts: z.object({
    low_stock: z.array(
      z.object({ product_id: z.string(), product_name: z.string(), unit: z.string(), stock: z.number(), min_stock: z.number() }),
    ),
    overdue_receivables: z.array(
      z.object({ invoice_id: z.string(), invoice_code: z.string(), customer_name: z.string(), balance: z.string(), due_date: z.string() }),
    ),
    orders_to_invoice: z.array(
      z.object({ id: z.string(), number: z.string(), customer_name: z.string(), total: z.string() }),
    ),
    pending_deliveries: z.array(
      z.object({
        id: z.string(),
        number: z.string(),
        customer_name: z.string(),
        method: z.enum(["shipping", "pickup"]),
        status: z.enum(["pending", "in_transit", "ready_for_pickup"]),
      }),
    ),
    purchase_orders_to_receive: z.array(
      z.object({
        id: z.string(),
        number: z.string(),
        supplier_name: z.string(),
        expected_date: z.string(),
        status: z.enum(["issued", "partially_received"]),
      }),
    ),
  }),
})

export type Dashboard = z.infer<typeof dashboardSchema>

/** Margen bruto sobre ventas en %, con 1 decimal. null si no hubo ventas. Lo usa el backend (mock) */
export function grossMarginPercent(salesCents: number, profitCents: number): number | null {
  if (salesCents <= 0) return null
  return Math.round((profitCents * 1000) / salesCents) / 10
}
