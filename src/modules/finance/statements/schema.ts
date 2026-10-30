import { z } from "zod"
import { isBusinessDate } from "@/shared/lib/dates"

export const PARTY_TYPES = ["customer", "supplier"] as const
export type PartyType = (typeof PARTY_TYPES)[number]

export const PARTY_TYPE_LABELS: Record<PartyType, string> = {
  customer: "Cliente",
  supplier: "Proveedor",
}

/** El estado de cuenta exige tercero y rango completo y ordenado (si no, la consulta no se hace) */
export const statementQuerySchema = z
  .object({
    party_type: z.enum(PARTY_TYPES),
    party_id: z.string().min(1, "Selecciona a quién"),
    date_from: z.string().refine(isBusinessDate, "Ingresa la fecha inicial"),
    date_to: z.string().refine(isBusinessDate, "Ingresa la fecha final"),
  })
  .refine((query) => query.date_from <= query.date_to, {
    message: "La fecha final no puede ser anterior a la inicial",
    path: ["date_to"],
  })
export type StatementQuery = z.infer<typeof statementQuerySchema>

export const STATEMENT_LINE_TYPES = ["invoice", "payment", "credit_note", "void"] as const
export type StatementLineType = (typeof STATEMENT_LINE_TYPES)[number]

export const STATEMENT_LINE_LABELS: Record<StatementLineType, string> = {
  invoice: "Comprobante",
  payment: "Pago",
  credit_note: "Nota de crédito",
  void: "Anulación",
}

export const statementSchema = z.object({
  party_name: z.string(),
  party_document: z.string(),
  date_from: z.string(),
  date_to: z.string(),
  /** Saldo antes del rango, calculado por el backend */
  opening_balance: z.string(),
  lines: z.array(
    z.object({
      date: z.string(),
      type: z.enum(STATEMENT_LINE_TYPES),
      document_code: z.string(),
      /** Cargo (aumenta la deuda) y abono (la reduce) */
      debit: z.string(),
      credit: z.string(),
      /** Saldo acumulado tras la línea: lo calcula el backend, el frontend no suma */
      balance: z.string(),
    }),
  ),
  closing_balance: z.string(),
})
export type Statement = z.infer<typeof statementSchema>
