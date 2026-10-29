import { z } from "zod"
import type { StatusTone } from "@/shared/components/StatusBadge"
import { todayInLima } from "@/shared/lib/dates"
import { toCents } from "@/shared/lib/money"

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

export function daysOverdue(dueDate: string, balance: string, today = todayInLima()): number {
  if (toCents(balance) <= 0) return 0
  const [dueYear, dueMonth, dueDay] = dueDate.split("-").map(Number)
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number)
  const due = Date.UTC(dueYear, dueMonth - 1, dueDay)
  const current = Date.UTC(todayYear, todayMonth - 1, todayDay)
  if (!Number.isFinite(due) || !Number.isFinite(current)) return 0
  return Math.max(0, Math.floor((current - due) / 86_400_000))
}

export function agingBucket(days: number): string {
  if (days <= 0) return "Al día"
  if (days <= 30) return "1-30 días"
  if (days <= 60) return "31-60 días"
  if (days <= 90) return "61-90 días"
  return "Más de 90 días"
}
