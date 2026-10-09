import { z } from "zod"
import type { StatusTone } from "@/shared/components/StatusBadge"
import { addDays } from "@/shared/lib/dates"
import { toCents } from "@/shared/lib/money"
import { businessDateSchema } from "@/shared/lib/schemas"

export const SUPPLIER_INVOICE_STATUSES = ["registered", "paid", "void"] as const
export type SupplierInvoiceStatus = (typeof SUPPLIER_INVOICE_STATUSES)[number]

/** Los pagos (Finanzas) la llevan a "paid". Anular solo sin pagos */
export const SUPPLIER_INVOICE_TRANSITIONS: Record<SupplierInvoiceStatus, SupplierInvoiceStatus[]> = {
  registered: ["paid", "void"],
  paid: [],
  void: [],
}

export const SUPPLIER_INVOICE_STATUS_LABELS: Record<SupplierInvoiceStatus, string> = {
  registered: "Registrada",
  paid: "Pagada",
  void: "Anulada",
}

export const SUPPLIER_INVOICE_STATUS_TONES: Record<SupplierInvoiceStatus, StatusTone> = {
  registered: "warning",
  paid: "success",
  void: "danger",
}

export function canTransitionSupplierInvoice(from: SupplierInvoiceStatus, to: SupplierInvoiceStatus): boolean {
  return SUPPLIER_INVOICE_TRANSITIONS[from].includes(to)
}

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

/** Proveedor + serie + número son únicos (409 si se repite). El vencimiento se propone con su plazo */
export const supplierInvoiceInputSchema = z
  .object({
    supplier_id: z.string().min(1, "Selecciona el proveedor"),
    order_id: z.string().min(1, "Selecciona la orden de compra"),
    series: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{4}$/, "La serie tiene 4 caracteres, ejemplo: F001"),
    number: z
      .string()
      .trim()
      .regex(/^\d{1,8}$/, "El número tiene de 1 a 8 dígitos"),
    issue_date: businessDateSchema("Ingresa la fecha de emisión"),
    due_date: businessDateSchema("Ingresa la fecha de vencimiento"),
    /** Total con IGV que figura en la factura del proveedor */
    total: z
      .string()
      .trim()
      .regex(AMOUNT_PATTERN, "Monto no válido, ejemplo: 1180.00")
      .refine((value) => !AMOUNT_PATTERN.test(value) || toCents(value) > 0, "El total debe ser mayor que cero"),
  })
  .refine((invoice) => invoice.due_date >= invoice.issue_date, {
    message: "El vencimiento no puede ser anterior a la emisión",
    path: ["due_date"],
  })

export type SupplierInvoiceInput = z.infer<typeof supplierInvoiceInputSchema>

export const supplierInvoiceSchema = z.object({
  id: z.string(),
  supplier_id: z.string(),
  supplier_name: z.string(),
  order_id: z.string(),
  order_number: z.string(),
  series: z.string(),
  number: z.string(),
  issue_date: z.string(),
  due_date: z.string(),
  total: z.string(),
  /** Valor de lo recibido según la orden (con IGV): lo calcula el backend */
  received_total: z.string(),
  /** Aviso del backend si el total no coincide con lo recibido ("" si cuadra) */
  warning: z.string(),
  paid: z.string(),
  balance: z.string(),
  status: z.enum(SUPPLIER_INVOICE_STATUSES),
  void_reason: z.string(),
  created_at: z.string(),
})

export type SupplierInvoice = z.infer<typeof supplierInvoiceSchema>

export const supplierInvoiceCode = (invoice: Pick<SupplierInvoice, "series" | "number">) =>
  `${invoice.series}-${invoice.number}`

/** Vencimiento propuesto: emisión + días de crédito del proveedor (editable) */
export const proposedDueDate = (issueDate: string, creditDays: number) => addDays(issueDate, creditDays)

export function emptySupplierInvoice(today: string): SupplierInvoiceInput {
  return { supplier_id: "", order_id: "", series: "", number: "", issue_date: today, due_date: today, total: "" }
}
