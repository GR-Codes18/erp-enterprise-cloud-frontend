import { z } from "zod"
import type { StatusTone } from "@/shared/components/StatusBadge"
import { isBusinessDate } from "@/shared/lib/dates"
import { toCents } from "@/shared/lib/money"
import { notesSchema } from "@/shared/lib/schemas"

export const PAYMENT_TYPES = ["collection", "payment"] as const
export type PaymentType = (typeof PAYMENT_TYPES)[number]

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  collection: "Cobro",
  payment: "Pago",
}

/** A qué documento se aplica: comprobante de venta (cobro) o factura de proveedor (pago) */
export const PAYMENT_DOCUMENT_TYPES = ["sales_invoice", "supplier_invoice"] as const
export type PaymentDocumentType = (typeof PAYMENT_DOCUMENT_TYPES)[number]

export const PAYMENT_METHODS = ["cash", "transfer", "card"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
}

export const PAYMENT_STATUSES = ["active", "void"] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  active: "Vigente",
  void: "Anulado",
}

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, StatusTone> = {
  active: "success",
  void: "danger",
}

/** Un pago no se edita: se anula con motivo y el saldo del documento se restituye */
export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  active: ["void"],
  void: [],
}

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to)
}

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

/**
 * Reglas del formulario de cobro/pago. `balance` (saldo del documento) y `today` vienen de la
 * pantalla: el monto debe ser > 0 y <= saldo, y la fecha no puede ser futura. El backend
 * vuelve a validar todo (y que haya caja abierta para efectivo).
 */
export function paymentInputSchema({ balance, today }: { balance: string; today: string }) {
  return z
    .object({
      type: z.enum(PAYMENT_TYPES),
      document_type: z.enum(PAYMENT_DOCUMENT_TYPES),
      document_id: z.string().min(1, "Selecciona el documento"),
      method: z.enum(PAYMENT_METHODS),
      amount: z.string().trim().regex(AMOUNT_PATTERN, "Monto no válido, ejemplo: 150.00"),
      payment_date: z.string().refine(isBusinessDate, "Ingresa la fecha del pago"),
      /** Transferencia: cuenta bancaria y número de operación obligatorios */
      bank_account_id: z.string(),
      operation_number: z.string().trim().max(40, "Máximo 40 caracteres"),
      reference: notesSchema,
    })
    .superRefine((payment, ctx) => {
      if (AMOUNT_PATTERN.test(payment.amount)) {
        const amount = toCents(payment.amount)
        if (amount <= 0) ctx.addIssue({ code: "custom", path: ["amount"], message: "El monto debe ser mayor que cero" })
        else if (amount > toCents(balance)) {
          ctx.addIssue({ code: "custom", path: ["amount"], message: "El monto no puede superar el saldo del documento" })
        }
      }
      if (isBusinessDate(payment.payment_date) && payment.payment_date > today) {
        ctx.addIssue({ code: "custom", path: ["payment_date"], message: "La fecha no puede ser futura" })
      }
      if (payment.method === "transfer") {
        if (!payment.bank_account_id) {
          ctx.addIssue({ code: "custom", path: ["bank_account_id"], message: "Selecciona la cuenta bancaria" })
        }
        if (!payment.operation_number) {
          ctx.addIssue({ code: "custom", path: ["operation_number"], message: "Ingresa el número de operación" })
        }
      }
    })
}

export type PaymentInput = z.infer<ReturnType<typeof paymentInputSchema>>

export const paymentSchema = z.object({
  id: z.string(),
  /** Correlativo que asigna el backend: "CB-000010" (cobro) o "PG-000004" (pago) */
  number: z.string(),
  type: z.enum(PAYMENT_TYPES),
  document_type: z.enum(PAYMENT_DOCUMENT_TYPES),
  document_id: z.string(),
  document_code: z.string(),
  /** Cliente (cobro) o proveedor (pago) */
  party_id: z.string(),
  party_name: z.string(),
  method: z.enum(PAYMENT_METHODS),
  amount: z.string(),
  payment_date: z.string(),
  bank_account_id: z.string(),
  bank_account_label: z.string(),
  operation_number: z.string(),
  reference: z.string(),
  status: z.enum(PAYMENT_STATUSES),
  void_reason: z.string(),
  created_at: z.string(),
})

export type Payment = z.infer<typeof paymentSchema>

export function emptyPayment(
  type: PaymentType,
  documentType: PaymentDocumentType,
  documentId: string,
  today: string,
): PaymentInput {
  return {
    type,
    document_type: documentType,
    document_id: documentId,
    method: "cash",
    amount: "",
    payment_date: today,
    bank_account_id: "",
    operation_number: "",
    reference: "",
  }
}
