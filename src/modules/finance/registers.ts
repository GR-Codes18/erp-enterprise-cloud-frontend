import { z } from "zod"
import { toCents } from "@/shared/lib/money"

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/
const amount = z.string().trim().regex(AMOUNT_PATTERN, "Ingresa un importe válido").refine((value) => !AMOUNT_PATTERN.test(value) || toCents(value) > 0, "El importe debe ser mayor que cero")

export const INSTRUMENT_TYPES = ["letter", "promissory_note", "check"] as const
export const INSTRUMENT_TYPE_LABELS: Record<(typeof INSTRUMENT_TYPES)[number], string> = {
  letter: "Letra",
  promissory_note: "Pagaré",
  check: "Cheque",
}
export const INSTRUMENT_STATUSES = ["pending", "paid", "void"] as const
export const INSTRUMENT_STATUS_LABELS: Record<(typeof INSTRUMENT_STATUSES)[number], string> = {
  pending: "Pendiente",
  paid: "Pagado",
  void: "Anulado",
}

export const instrumentInputSchema = z.object({
  type: z.enum(INSTRUMENT_TYPES),
  number: z.string().trim().min(1, "Ingresa el número").max(40),
  third_party: z.string().trim().min(2, "Ingresa el tercero").max(120),
  amount,
  issue_date: z.string().date("Ingresa una fecha válida"),
  due_date: z.string().date("Ingresa una fecha válida"),
})
export type InstrumentInput = z.infer<typeof instrumentInputSchema>
export const instrumentSchema = instrumentInputSchema.extend({
  id: z.string(),
  status: z.enum(INSTRUMENT_STATUSES),
})
export type FinancialInstrument = z.infer<typeof instrumentSchema>

export const TAX_STATUSES = ["pending", "paid"] as const
export const TAX_STATUS_LABELS: Record<(typeof TAX_STATUSES)[number], string> = {
  pending: "Pendiente",
  paid: "Pagado",
}
export const taxInputSchema = z.object({
  tax_type: z.string().trim().min(2, "Ingresa el tipo de tributo").max(60),
  period: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Usa el formato AAAA-MM"),
  base: amount,
  amount,
  document_origin: z.string().trim().min(1, "Ingresa el documento de origen").max(80),
})
export type TaxInput = z.infer<typeof taxInputSchema>
export const taxRecordSchema = taxInputSchema.extend({
  id: z.string(),
  status: z.enum(TAX_STATUSES),
})
export type TaxRecord = z.infer<typeof taxRecordSchema>

export type FinanceRegisterKind = "instruments" | "taxes"
export type FinanceRegisterRecord = FinancialInstrument | TaxRecord
export type FinanceRegisterInput = InstrumentInput | TaxInput
