import { z } from "zod"
import type { StatusTone } from "@/shared/components/StatusBadge"

/**
 * Cuentas por cobrar y por pagar: nacen solas de los comprobantes a crédito (venta o compra).
 * No tienen pantalla de crear. "overdue" lo calcula el backend: vencida y con saldo > 0.
 */
export const ACCOUNT_STATUSES = ["pending", "partially_paid", "paid", "overdue"] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  pending: "Pendiente",
  partially_paid: "Pago parcial",
  paid: "Pagada",
  overdue: "Vencida",
}

export const ACCOUNT_STATUS_TONES: Record<AccountStatus, StatusTone> = {
  pending: "warning",
  partially_paid: "warning",
  paid: "success",
  overdue: "danger",
}

const accountFields = {
  id: z.string(),
  /** Comprobante de venta o factura del proveedor que la originó */
  invoice_id: z.string(),
  invoice_code: z.string(),
  issue_date: z.string(),
  due_date: z.string(),
  total: z.string(),
  paid: z.string(),
  balance: z.string(),
  status: z.enum(ACCOUNT_STATUSES),
}

export const receivableSchema = z.object({
  ...accountFields,
  customer_id: z.string(),
  customer_name: z.string(),
})

export const payableSchema = z.object({
  ...accountFields,
  supplier_id: z.string(),
  supplier_name: z.string(),
})

export type Receivable = z.infer<typeof receivableSchema>
export type Payable = z.infer<typeof payableSchema>

/** Se puede registrar un cobro o pago mientras quede saldo */
export const canRegisterPayment = (account: Pick<Receivable, "status">) => account.status !== "paid"
