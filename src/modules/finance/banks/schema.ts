import { z } from "zod"
import type { StatusTone } from "@/shared/components/StatusBadge"
import { isBusinessDate } from "@/shared/lib/dates"
import { toCents } from "@/shared/lib/money"

export const BANK_ACCOUNT_STATUSES = ["active", "inactive"] as const
export type BankAccountStatus = (typeof BANK_ACCOUNT_STATUSES)[number]

export const BANK_ACCOUNT_STATUS_LABELS: Record<BankAccountStatus, string> = {
  active: "Activa",
  inactive: "Inactiva",
}

export const CURRENCIES = ["PEN", "USD"] as const
export type Currency = (typeof CURRENCIES)[number]

export const CURRENCY_LABELS: Record<Currency, string> = {
  PEN: "Soles (PEN)",
  USD: "Dólares (USD)",
}

/** Cuenta bancaria: catálogo (receta 4.1). Con movimientos no se borra: se desactiva */
export const bankAccountInputSchema = z.object({
  bank: z.string().trim().min(2, "Ingresa el banco").max(60, "Máximo 60 caracteres"),
  number: z
    .string()
    .trim()
    .regex(/^[0-9-]{6,30}$/, "Solo números y guiones, de 6 a 30 caracteres"),
  currency: z.enum(CURRENCIES),
  status: z.enum(BANK_ACCOUNT_STATUSES),
})
export type BankAccountInput = z.infer<typeof bankAccountInputSchema>

export const bankAccountSchema = bankAccountInputSchema.extend({
  id: z.string(),
  /** Saldo según movimientos: lo calcula el backend */
  balance: z.string(),
})
export type BankAccount = z.infer<typeof bankAccountSchema>

export const EMPTY_BANK_ACCOUNT: BankAccountInput = { bank: "", number: "", currency: "PEN", status: "active" }

export const bankAccountLabel = (account: Pick<BankAccount, "bank" | "number" | "currency">) =>
  `${account.bank} ${account.number} (${account.currency})`

export const BANK_MOVEMENT_TYPES = ["income", "expense"] as const
export type BankMovementType = (typeof BANK_MOVEMENT_TYPES)[number]

export const BANK_MOVEMENT_TYPE_LABELS: Record<BankMovementType, string> = {
  income: "Ingreso",
  expense: "Egreso",
}

export const BANK_MOVEMENT_SOURCE_LABELS = {
  manual: "Manual",
  payment: "Cobro o pago",
} as const

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

/** Los movimientos de cobros/pagos por transferencia entran solos; los manuales piden concepto */
export function bankMovementInputSchema(today: string) {
  return z.object({
    type: z.enum(BANK_MOVEMENT_TYPES),
    concept: z.string().trim().min(3, "Ingresa el concepto").max(200, "Máximo 200 caracteres"),
    amount: z
      .string()
      .trim()
      .regex(AMOUNT_PATTERN, "Monto no válido, ejemplo: 150.00")
      .refine((value) => !AMOUNT_PATTERN.test(value) || toCents(value) > 0, "El monto debe ser mayor que cero"),
    movement_date: z
      .string()
      .refine(isBusinessDate, "Ingresa la fecha")
      .refine((value) => !isBusinessDate(value) || value <= today, "La fecha no puede ser futura"),
  })
}
export type BankMovementInput = z.infer<ReturnType<typeof bankMovementInputSchema>>

export const bankMovementSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  type: z.enum(BANK_MOVEMENT_TYPES),
  concept: z.string(),
  amount: z.string(),
  movement_date: z.string(),
  source: z.enum(["manual", "payment"]),
  /** Opcional v1: marcado como conciliado con el extracto del banco */
  reconciled: z.boolean(),
})
export type BankMovement = z.infer<typeof bankMovementSchema>

export const RECONCILED_TONES: Record<"yes" | "no", StatusTone> = { yes: "success", no: "neutral" }
