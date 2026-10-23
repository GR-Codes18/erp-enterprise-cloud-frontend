import { z } from "zod"
import type { StatusTone } from "@/shared/components/StatusBadge"
import { toCents } from "@/shared/lib/money"

export const INVOICE_TYPES = ["invoice", "receipt"] as const
export type InvoiceType = (typeof INVOICE_TYPES)[number]

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  invoice: "Factura",
  receipt: "Boleta",
}

export const INVOICE_STATUSES = ["issued", "partially_paid", "paid", "void"] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

/** Los cobros (Finanzas) mueven issued → partially_paid → paid. Anular solo sin cobros */
export const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  issued: ["partially_paid", "paid", "void"],
  partially_paid: ["paid"],
  paid: [],
  void: [],
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  issued: "Emitido",
  partially_paid: "Pago parcial",
  paid: "Pagado",
  void: "Anulado",
}

export const INVOICE_STATUS_TONES: Record<InvoiceStatus, StatusTone> = {
  issued: "warning",
  partially_paid: "warning",
  paid: "success",
  void: "danger",
}

export function canTransitionInvoice(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return INVOICE_TRANSITIONS[from].includes(to)
}

/**
 * Regla simplificada v1 (sin normativa tributaria real): la factura exige cliente con RUC;
 * la boleta se emite a cualquier cliente. El backend responde 422 si no se cumple.
 */
export function canIssueAs(type: InvoiceType, customerDocumentType: string): boolean {
  return type === "receipt" || customerDocumentType === "RUC"
}

export const issueInvoiceSchema = z.object({ type: z.enum(INVOICE_TYPES) })
export type IssueInvoiceInput = z.infer<typeof issueInvoiceSchema>

const invoiceLineSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  quantity: z.number(),
  unit_price: z.string(),
  /** Unidades ya devueltas en devoluciones confirmadas */
  returned_quantity: z.number(),
})

export const invoiceSchema = z.object({
  id: z.string(),
  type: z.enum(INVOICE_TYPES),
  /** Serie y número los asigna el backend: "F001" / "00000123" */
  series: z.string(),
  number: z.string(),
  order_id: z.string(),
  order_number: z.string(),
  customer_id: z.string(),
  customer_name: z.string(),
  customer_document: z.string(),
  issue_date: z.string(),
  /** Vencimiento de un comprobante a crédito ("" si es al contado) */
  due_date: z.string(),
  payment_condition: z.enum(["cash", "credit"]),
  items: z.array(invoiceLineSchema),
  subtotal: z.string(),
  igv: z.string(),
  total: z.string(),
  /** Cobrado y saldo: los calcula el backend con los cobros de Finanzas */
  paid: z.string(),
  balance: z.string(),
  status: z.enum(INVOICE_STATUSES),
  void_reason: z.string(),
  created_at: z.string(),
})

export type Invoice = z.infer<typeof invoiceSchema>

/** "F001-00000123" */
export const invoiceCode = (invoice: Pick<Invoice, "series" | "number">) => `${invoice.series}-${invoice.number}`

/** Anular solo un comprobante emitido y sin cobros (el backend revierte el stock) */
export function canVoidInvoice(invoice: Pick<Invoice, "status" | "paid">): boolean {
  return canTransitionInvoice(invoice.status, "void") && toCents(invoice.paid) === 0
}
