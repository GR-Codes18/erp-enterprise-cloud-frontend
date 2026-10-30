import { z } from "zod"
import type { StatusTone } from "@/shared/components/StatusBadge"
import { toCents } from "@/shared/lib/money"

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/
const amountSchema = (label: string) =>
  z.string().trim().regex(AMOUNT_PATTERN, `${label} no válido, ejemplo: 150.00`)

export const CASH_SESSION_STATUSES = ["open", "closed"] as const
export type CashSessionStatus = (typeof CASH_SESSION_STATUSES)[number]

/** Una sesión cerrada es solo lectura */
export const CASH_SESSION_TRANSITIONS: Record<CashSessionStatus, CashSessionStatus[]> = {
  open: ["closed"],
  closed: [],
}

export function canTransitionCashSession(from: CashSessionStatus, to: CashSessionStatus): boolean {
  return CASH_SESSION_TRANSITIONS[from].includes(to)
}

export const CASH_SESSION_STATUS_LABELS: Record<CashSessionStatus, string> = {
  open: "Abierta",
  closed: "Cerrada",
}

export const CASH_SESSION_STATUS_TONES: Record<CashSessionStatus, StatusTone> = {
  open: "success",
  closed: "neutral",
}

export const cashRegisterSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["petty", "general"]),
  branch_id: z.string(),
  responsible_id: z.string(),
  assigned_fund: z.string(),
  /** Sesión abierta de la caja ("" si no hay): solo puede haber una */
  open_session_id: z.string(),
})
export type CashRegister = z.infer<typeof cashRegisterSchema>

export const CASH_MOVEMENT_CONCEPTS = [
  "Venta / cobro",
  "Compra de suministros",
  "Movilidad",
  "Servicios",
  "Depósito bancario",
  "Otros",
] as const

export const openSessionSchema = z.object({
  register_id: z.string().min(1, "Selecciona la caja"),
  opening_amount: amountSchema("Monto inicial"),
})
export type OpenSessionInput = z.infer<typeof openSessionSchema>

export const CASH_MOVEMENT_TYPES = ["income", "expense"] as const
export type CashMovementType = (typeof CASH_MOVEMENT_TYPES)[number]

export const CASH_MOVEMENT_TYPE_LABELS: Record<CashMovementType, string> = {
  income: "Ingreso",
  expense: "Egreso",
}

/** Ingresos y egresos manuales: el concepto es obligatorio */
export const cashMovementInputSchema = z.object({
  type: z.enum(CASH_MOVEMENT_TYPES),
  concept: z.string().trim().min(3, "Ingresa el concepto").max(200, "Máximo 200 caracteres"),
  amount: amountSchema("Monto").refine((value) => !AMOUNT_PATTERN.test(value) || toCents(value) > 0, "El monto debe ser mayor que cero"),
})
export type CashMovementInput = z.infer<typeof cashMovementInputSchema>

export const cashMovementSchema = z.object({
  id: z.string(),
  type: z.enum(CASH_MOVEMENT_TYPES),
  concept: z.string(),
  amount: z.string(),
  /** "payment" si nació de un cobro o pago en efectivo; "manual" si se registró en caja */
  source: z.enum(["manual", "payment"]),
  created_at: z.string(),
})
export type CashMovement = z.infer<typeof cashMovementSchema>

/** Al cerrar se ingresa el efectivo contado; la nota es obligatoria si hay diferencia */
export function closeSessionSchema(expectedAmount: string) {
  return z
    .object({
      counted_amount: amountSchema("Efectivo contado"),
      note: z.string().trim().max(300, "Máximo 300 caracteres"),
    })
    .superRefine((value, ctx) => {
      if (!AMOUNT_PATTERN.test(value.counted_amount)) return
      if (cashDifferenceCents(expectedAmount, value.counted_amount) !== 0 && value.note.length < 5) {
        ctx.addIssue({ code: "custom", path: ["note"], message: "Explica la diferencia (sobrante o faltante)" })
      }
    })
}
export type CloseSessionInput = z.infer<ReturnType<typeof closeSessionSchema>>

export const cashSessionSchema = z.object({
  id: z.string(),
  number: z.string(),
  register_id: z.string(),
  register_name: z.string(),
  status: z.enum(CASH_SESSION_STATUSES),
  opened_at: z.string(),
  opened_by_name: z.string(),
  opening_amount: z.string(),
  /** Inicial + ingresos − egresos: lo calcula el backend */
  expected_amount: z.string(),
  counted_amount: z.string(),
  difference: z.string(),
  closing_note: z.string(),
  closed_at: z.string(),
  movements: z.array(cashMovementSchema),
})
export type CashSession = z.infer<typeof cashSessionSchema>

/** Contado − esperado, en centavos: > 0 sobrante, < 0 faltante */
export function cashDifferenceCents(expected: string, counted: string): number {
  return toCents(counted) - toCents(expected)
}

export function describeDifference(cents: number): { label: string; tone: StatusTone } {
  if (cents === 0) return { label: "Cuadra", tone: "success" }
  return cents > 0 ? { label: "Sobrante", tone: "warning" } : { label: "Faltante", tone: "danger" }
}

/** "Faltante S/ 2.00": la palabra ya dice el signo, el monto va en positivo */
export function differenceText(cents: number, format: (cents: number) => string): string {
  const { label } = describeDifference(cents)
  return cents === 0 ? label : `${label} ${format(Math.abs(cents))}`
}
