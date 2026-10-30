import { z } from "zod"
import type { StatusTone } from "@/shared/components/StatusBadge"
import { addDays } from "@/shared/lib/dates"
import { EMPTY_LINE } from "@/shared/lib/lines"
import { businessDateSchema, notesSchema } from "@/shared/lib/schemas"

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected", "expired"] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

/** "expired" lo marca el backend al pasar valid_until: no es una acción del usuario */
export const QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["sent"],
  sent: ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
}

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Vencida",
}

export const QUOTE_STATUS_TONES: Record<QuoteStatus, StatusTone> = {
  draft: "neutral",
  sent: "warning",
  accepted: "success",
  rejected: "danger",
  expired: "neutral",
}

export function canTransitionQuote(from: QuoteStatus, to: QuoteStatus): boolean {
  return QUOTE_TRANSITIONS[from].includes(to)
}

/** Días de validez que se proponen al crear (editable) */
export const DEFAULT_VALIDITY_DAYS = 15

const quoteLineInputSchema = z.object({
  product_id: z.string().min(1, "Selecciona un producto"),
  warehouse_id: z.string().min(1, "Selecciona un almacén"),
  quantity: z
    .number({ message: "Ingresa una cantidad válida" })
    .int("La cantidad debe ser entera")
    .positive("La cantidad debe ser mayor que cero"),
  unit_price: z
    .string()
    .trim()
    .min(1, "Ingresa el precio")
    .regex(/^\d+(\.\d{1,2})?$/, "Precio no válido, ejemplo: 45.50"),
})

export const quoteInputSchema = z
  .object({
    customer_id: z.string().min(1, "Selecciona un cliente"),
    issue_date: businessDateSchema("Ingresa la fecha de emisión"),
    valid_until: businessDateSchema("Ingresa la fecha de validez"),
    items: z.array(quoteLineInputSchema).min(1, "Agrega al menos un producto"),
    notes: notesSchema,
  })
  .refine((quote) => quote.valid_until >= quote.issue_date, {
    message: "La validez no puede ser anterior a la fecha de emisión",
    path: ["valid_until"],
  })

export type QuoteInput = z.infer<typeof quoteInputSchema>

const quoteLineSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  warehouse_id: z.string(),
  warehouse_name: z.string(),
  quantity: z.number(),
  unit_price: z.string(),
})

export const quoteSchema = z.object({
  id: z.string(),
  /** Correlativo que asigna el backend, ej. "COT-000012" */
  number: z.string(),
  customer_id: z.string(),
  customer_name: z.string(),
  issue_date: z.string(),
  valid_until: z.string(),
  items: z.array(quoteLineSchema),
  notes: z.string(),
  status: z.enum(QUOTE_STATUSES),
  subtotal: z.string(),
  igv: z.string(),
  total: z.string(),
  /** Pedido creado al convertir la cotización aceptada ("" si aún no se convierte) */
  order_id: z.string(),
  rejection_reason: z.string(),
  created_at: z.string(),
})

export type Quote = z.infer<typeof quoteSchema>

export function emptyQuote(today: string): QuoteInput {
  return {
    customer_id: "",
    issue_date: today,
    valid_until: addDays(today, DEFAULT_VALIDITY_DAYS),
    items: [{ ...EMPTY_LINE, warehouse_id: "" }],
    notes: "",
  }
}

export function toQuoteInput(quote: Quote): QuoteInput {
  return {
    customer_id: quote.customer_id,
    issue_date: quote.issue_date,
    valid_until: quote.valid_until,
    items: quote.items.map(({ product_id, warehouse_id, quantity, unit_price }) => ({ product_id, warehouse_id, quantity, unit_price })),
    notes: quote.notes,
  }
}

/** Solo una cotización aceptada y aún sin pedido ofrece "Convertir en pedido" */
export function canConvertQuote(quote: Pick<Quote, "status" | "order_id">): boolean {
  return quote.status === "accepted" && quote.order_id === ""
}
