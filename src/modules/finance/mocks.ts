import { delay, http, HttpResponse, type RequestHandler } from "msw"
import { env } from "@/config/env"
import { CUSTOMERS, SUPPLIERS, customerRef, supplierRef } from "@/mocks/refs"
import { createCrudHandlers } from "@/mocks/utils/crud"
import { applyListFilters } from "@/mocks/utils/filters"
import { nextNumber } from "@/mocks/utils/documents"
import {
  applySalesInvoicePayment,
  currentSalesInvoices,
  currentSalesReturns,
  salesInvoiceSeed,
} from "@/modules/sales/mocks"
import {
  applySupplierInvoicePayment,
  currentSupplierInvoices,
  supplierInvoiceSeed,
} from "@/modules/purchases/mocks"
import type { ApiErrorBody, Paginated } from "@/shared/lib/api/types"
import { todayInLima } from "@/shared/lib/dates"
import { newId } from "@/shared/lib/id"
import { fromCents, toCents } from "@/shared/lib/money"
import { reasonSchema } from "@/shared/lib/reasonSchema"
import {
  instrumentInputSchema,
  taxInputSchema,
  type FinancialInstrument,
  type TaxRecord,
} from "./registers"
import type { AccountStatus, Payable, Receivable } from "./accounts/schema"
import {
  bankAccountInputSchema,
  bankAccountLabel,
  bankMovementInputSchema,
  type BankAccount,
  type BankMovement,
} from "./banks/schema"
import {
  cashMovementInputSchema,
  closeSessionSchema,
  openSessionSchema,
  type CashMovement,
  type CashRegister,
  type CashSession,
} from "./cash/schema"
import { paymentInputSchema, type Payment } from "./payments/schema"
import { statementQuerySchema, type Statement } from "./statements/schema"

/**
 * UUID por recurso: por cobrar 8060, por pagar 8061, cobros/pagos 8062, cajas 8063,
 * sesiones de caja 8064, movimientos de caja 8065, cuentas bancarias 8066, movimientos bancarios 8067.
 * Efectos DENTRO de Finanzas (saldo de la cuenta, movimiento de caja o banco) sí se simulan;
 * el estado del comprobante en Ventas o Compras lo actualiza el backend.
 */
const uuid = (prefix: string, n: number) => `00000000-0000-4000-${prefix}-${String(n).padStart(12, "0")}`
const base = (path: string) => `${env.apiBaseUrl}/finance/${path}`

const errorResponse = (status: number, code: string, message: string, errors?: ApiErrorBody["errors"]) =>
  HttpResponse.json<ApiErrorBody>({ code, message, ...(errors ? { errors } : {}) }, { status })
const notFound = () => errorResponse(404, "NOT_FOUND", "Recurso no encontrado")
const validation = (issues: { path: PropertyKey[]; message: string }[]) =>
  errorResponse(
    422,
    "VALIDATION_ERROR",
    "Revisa los datos ingresados.",
    issues.map((issue) => ({ field: issue.path.map(String).join("."), message: issue.message })),
  )

function paginate<T>(items: T[], params: URLSearchParams): Paginated<T> {
  const page = Math.max(1, Number(params.get("page")) || 1)
  const size = Math.min(100, Math.max(1, Number(params.get("size")) || 20))
  return {
    items: items.slice((page - 1) * size, page * size),
    total: items.length,
    page,
    size,
    pages: Math.max(1, Math.ceil(items.length / size)),
  }
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json()
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/** Estado calculado como lo haría el backend: vencida si pasó el vencimiento con saldo */
function accountStatus(total: string, paid: string, dueDate: string): AccountStatus {
  const balance = toCents(total) - toCents(paid)
  if (balance <= 0) return "paid"
  if (dueDate < todayInLima()) return "overdue"
  return toCents(paid) > 0 ? "partially_paid" : "pending"
}

// ---------------------------------------------------------------- Cuentas por cobrar y por pagar

interface AccountRow {
  id: string
  invoice_id: string
  invoice_code: string
  issue_date: string
  due_date: string
  total: string
  paid: string
}

let receivables: (AccountRow & { customer_id: string; customer_name: string })[] = salesInvoiceSeed
  .filter((invoice) => invoice.payment_condition === "credit" && invoice.status !== "void")
  .map((invoice, index) => ({
    id: uuid("8060", index + 1),
    invoice_id: invoice.id,
    invoice_code: `${invoice.series}-${invoice.number}`,
    customer_id: invoice.customer_id,
    customer_name: invoice.customer_name,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    total: invoice.total,
    paid: invoice.paid,
  }))

let payables: (AccountRow & { supplier_id: string; supplier_name: string })[] = supplierInvoiceSeed
  .filter((invoice) => invoice.status !== "void")
  .map((invoice, index) => ({
    id: uuid("8061", index + 1),
    invoice_id: invoice.id,
    invoice_code: `${invoice.series}-${invoice.number}`,
    supplier_id: invoice.supplier_id,
    supplier_name: invoice.supplier_name,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    total: invoice.total,
    paid: invoice.paid,
  }))
let receivableCounter = receivables.length
let payableCounter = payables.length

const withStatus = <T extends AccountRow>(row: T) => ({
  ...row,
  balance: fromCents(toCents(row.total) - toCents(row.paid)),
  status: accountStatus(row.total, row.paid, row.due_date),
})

function syncFinancialAccounts() {
  const salesAccounts = currentSalesInvoices().filter(
    (invoice) => invoice.payment_condition === "credit" && invoice.status !== "void",
  )
  receivables = salesAccounts.map((invoice) => {
    const existing = receivables.find((row) => row.invoice_id === invoice.id)
    if (existing) {
      return {
        ...existing,
        invoice_code: `${invoice.series}-${invoice.number}`,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        total: invoice.total,
      }
    }
    receivableCounter += 1
    return {
      id: uuid("8060", receivableCounter),
      invoice_id: invoice.id,
      invoice_code: `${invoice.series}-${invoice.number}`,
      customer_id: invoice.customer_id,
      customer_name: invoice.customer_name,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      total: invoice.total,
      paid: invoice.paid,
    }
  })

  const supplierAccounts = currentSupplierInvoices().filter((invoice) => invoice.status !== "void")
  payables = supplierAccounts.map((invoice) => {
    const existing = payables.find((row) => row.invoice_id === invoice.id)
    if (existing) {
      return {
        ...existing,
        invoice_code: `${invoice.series}-${invoice.number}`,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        total: invoice.total,
      }
    }
    payableCounter += 1
    return {
      id: uuid("8061", payableCounter),
      invoice_id: invoice.id,
      invoice_code: `${invoice.series}-${invoice.number}`,
      supplier_id: invoice.supplier_id,
      supplier_name: invoice.supplier_name,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      total: invoice.total,
      paid: invoice.paid,
    }
  })
}

/**
 * Saldo de un documento por cobrar o pagar, incluidos los comprobantes al contado y los
 * documentos emitidos o registrados durante la sesión.
 */
function documentBalance(documentType: string, documentId: string) {
  // Solo lo ejecutado afecta el saldo; registros y aprobaciones reservan saldo temporalmente.
  const paidOf = (id: string) =>
    payments
      .filter((payment) => payment.status === "executed")
      .flatMap((payment) => payment.applications)
      .filter((application) => application.document_id === id)
      .reduce((sum, application) => sum + toCents(application.amount), 0)
  if (documentType === "sales_invoice") {
    const invoice = currentSalesInvoices().find((candidate) => candidate.id === documentId)
    if (!invoice || invoice.status === "void") return undefined
    const paid = paidOf(invoice.id)
    return { balance: fromCents(toCents(invoice.total) - paid), party_id: invoice.customer_id, party_name: invoice.customer_name, code: `${invoice.series}-${invoice.number}` }
  }
  if (documentType === "supplier_invoice") {
    const invoice = currentSupplierInvoices().find((candidate) => candidate.id === documentId)
    if (!invoice || invoice.status === "void") return undefined
    const paid = paidOf(invoice.id)
    return { balance: fromCents(toCents(invoice.total) - paid), party_id: invoice.supplier_id, party_name: invoice.supplier_name, code: `${invoice.series}-${invoice.number}` }
  }
  return undefined
}

function addPaidToAccount(documentId: string, deltaCents: number) {
  syncFinancialAccounts()
  const apply = <T extends AccountRow>(row: T): T =>
    row.invoice_id === documentId ? { ...row, paid: fromCents(toCents(row.paid) + deltaCents) } : row
  receivables = receivables.map(apply)
  payables = payables.map(apply)
  applySalesInvoicePayment(documentId, deltaCents)
  applySupplierInvoicePayment(documentId, deltaCents)
}

// ---------------------------------------------------------------- Bancos

/** Comprobantes semilla que tienen cobros (deben existir en salesInvoiceSeed) */
const paidReceipt = salesInvoiceSeed[1]
const transferInvoice = salesInvoiceSeed[3]

const bankAccountSeed: BankAccount[] = [
  { id: uuid("8066", 1), bank: "BCP", number: "193-2045678-0-12", currency: "PEN", branch_id: "", status: "active", balance: "45890.40" },
  { id: uuid("8066", 2), bank: "Interbank", number: "200-3001234567", currency: "USD", branch_id: "", status: "active", balance: "8200.00" },
  { id: uuid("8066", 3), bank: "BBVA", number: "0011-0234-0100045678", currency: "PEN", branch_id: "", status: "inactive", balance: "0.00" },
]
let bankAccounts = [...bankAccountSeed]
export const isCurrencyInUse = (currency: string) =>
  bankAccounts.some((account) => account.currency === currency)
export const isBranchInUse = (branchId: string) =>
  bankAccounts.some((account) => account.branch_id === branchId)
let bankMovements: BankMovement[] = [
  { id: uuid("8067", 1), account_id: uuid("8066", 1), type: "income", concept: `Cobro F001-00000100 (${transferInvoice.customer_name})`, amount: transferInvoice.total, movement_date: "2026-09-10", source: "payment", reconciled: true },
  { id: uuid("8067", 2), account_id: uuid("8066", 1), type: "expense", concept: "Pago F001-00004521 (Aceros y Perfiles)", amount: "4248.00", movement_date: "2026-09-29", source: "payment", reconciled: true },
  { id: uuid("8067", 3), account_id: uuid("8066", 1), type: "expense", concept: "Comisión de mantenimiento de cuenta", amount: "15.00", movement_date: "2026-09-30", source: "manual", reconciled: false },
  { id: uuid("8067", 4), account_id: uuid("8066", 1), type: "income", concept: "Depósito de caja del 05/10", amount: "1200.00", movement_date: "2026-10-05", source: "manual", reconciled: false },
  { id: uuid("8067", 5), account_id: uuid("8066", 2), type: "income", concept: "Depósito inicial en dólares", amount: "8200.00", movement_date: "2026-08-01", source: "manual", reconciled: true },
]
const accountLabel = (accountId: string) => {
  const account = bankAccounts.find((candidate) => candidate.id === accountId)
  return account ? bankAccountLabel(account) : ""
}
function addBankMovement(accountId: string, type: BankMovement["type"], concept: string, amount: string, date: string, source: BankMovement["source"]) {
  const movement: BankMovement = { id: newId(), account_id: accountId, type, concept, amount, movement_date: date, source, reconciled: false }
  bankMovements = [movement, ...bankMovements]
  const delta = type === "income" ? toCents(amount) : -toCents(amount)
  bankAccounts = bankAccounts.map((account) =>
    account.id === accountId ? { ...account, balance: fromCents(toCents(account.balance) + delta) } : account,
  )
  return movement
}

// ---------------------------------------------------------------- Caja

const registers: Omit<CashRegister, "open_session_id">[] = [
  { id: uuid("8063", 1), name: "Caja general principal", kind: "general", branch_id: "", responsible_id: "user-1", assigned_fund: "0.00" },
  { id: uuid("8063", 2), name: "Caja chica Ate", kind: "petty", branch_id: "", responsible_id: "user-2", assigned_fund: "500.00" },
]
const cashMovement = (n: number, type: CashMovement["type"], concept: string, amount: string, source: CashMovement["source"], created_at: string): CashMovement => ({
  id: uuid("8065", n),
  type,
  concept,
  amount,
  source,
  created_at,
})
/** Esperado = inicial + ingresos − egresos (lo calcula el backend) */
const expectedOf = (opening: string, movements: readonly CashMovement[]) =>
  fromCents(movements.reduce((sum, m) => sum + (m.type === "income" ? toCents(m.amount) : -toCents(m.amount)), toCents(opening)))

let cashSessions: CashSession[] = [
  (() => {
    const movements = [
      cashMovement(1, "income", `Cobro B001-00000201 (${paidReceipt.customer_name})`, paidReceipt.total, "payment", "2026-09-28T16:30:00Z"),
      cashMovement(2, "expense", "Compra de útiles de limpieza", "45.00", "manual", "2026-09-28T19:00:00Z"),
    ]
    const expected = expectedOf("200.00", movements)
    // Al cierre se contaron S/ 2.00 menos de lo esperado
    const counted = fromCents(toCents(expected) - 200)
    return {
      id: uuid("8064", 1),
      number: "CAJA-000001",
      register_id: registers[0].id,
      register_name: registers[0].name,
      status: "closed" as const,
      opened_at: "2026-09-28T13:00:00Z",
      opened_by_name: "Gabriel Romero",
      opening_amount: "200.00",
      expected_amount: expected,
      counted_amount: counted,
      difference: fromCents(toCents(counted) - toCents(expected)),
      closing_note: "Faltaron S/ 2.00: vuelto mal entregado.",
      closed_at: "2026-09-28T23:00:00Z",
      movements,
    }
  })(),
  (() => {
    const movements = [
      cashMovement(3, "income", "Cobro F001-00000101 (Comercial Andina)", "300.00", "payment", "2026-10-08T15:00:00Z"),
      cashMovement(4, "expense", "Pago de movilidad a repartidor", "25.00", "manual", "2026-10-08T17:00:00Z"),
    ]
    return {
      id: uuid("8064", 2),
      number: "CAJA-000002",
      register_id: registers[0].id,
      register_name: registers[0].name,
      status: "open" as const,
      opened_at: "2026-10-08T13:00:00Z",
      opened_by_name: "Gabriel Romero",
      opening_amount: "150.00",
      expected_amount: expectedOf("150.00", movements),
      counted_amount: "",
      difference: "",
      closing_note: "",
      closed_at: "",
      movements,
    }
  })(),
]
let cashCounter = cashSessions.length
const openSessionOf = (registerId: string) => cashSessions.find((s) => s.register_id === registerId && s.status === "open")
function addCashMovement(sessionId: string, type: CashMovement["type"], concept: string, amount: string, source: CashMovement["source"]) {
  cashSessions = cashSessions.map((session) => {
    if (session.id !== sessionId) return session
    const movements = [...session.movements, { id: newId(), type, concept, amount, source, created_at: new Date().toISOString() }]
    return { ...session, movements, expected_amount: expectedOf(session.opening_amount, movements) }
  })
  return cashSessions.find((session) => session.id === sessionId)
}

// ---------------------------------------------------------------- Cobros y pagos

const findSales = (n: number) => salesInvoiceSeed[n - 1]
const payment = (
  n: number,
  values: Omit<Payment, "id" | "status" | "void_reason" | "created_at" | "reference" | "bank_account_label" | "applications">,
): Payment => ({
  ...values,
  id: uuid("8062", n),
  reference: "",
  bank_account_label: values.bank_account_id ? accountLabel(values.bank_account_id) : "",
  applications: [{ document_id: values.document_id, document_code: values.document_code, amount: values.amount }],
  status: "executed",
  void_reason: "",
  created_at: `${values.payment_date}T16:00:00Z`,
})

let payments: Payment[] = [
  payment(1, { number: "CB-000001", type: "collection", document_type: "sales_invoice", document_id: findSales(4).id, document_code: "F001-00000100", party_id: findSales(4).customer_id, party_name: findSales(4).customer_name, method: "transfer", amount: findSales(4).total, payment_date: "2026-09-10", bank_account_id: uuid("8066", 1), operation_number: "00458712" }),
  payment(2, { number: "CB-000002", type: "collection", document_type: "sales_invoice", document_id: findSales(2).id, document_code: "B001-00000201", party_id: findSales(2).customer_id, party_name: findSales(2).customer_name, method: "cash", amount: findSales(2).total, payment_date: "2026-09-28", bank_account_id: "", operation_number: "" }),
  payment(3, { number: "CB-000003", type: "collection", document_type: "sales_invoice", document_id: findSales(1).id, document_code: "F001-00000101", party_id: findSales(1).customer_id, party_name: findSales(1).customer_name, method: "cash", amount: "300.00", payment_date: "2026-10-08", bank_account_id: "", operation_number: "" }),
  payment(4, { number: "PG-000001", type: "payment", document_type: "supplier_invoice", document_id: supplierInvoiceSeed[0].id, document_code: "F001-00004521", party_id: supplierInvoiceSeed[0].supplier_id, party_name: supplierInvoiceSeed[0].supplier_name, method: "transfer", amount: "4248.00", payment_date: "2026-09-29", bank_account_id: uuid("8066", 1), operation_number: "00460021" }),
]
export const isPaymentMethodInUse = (method: string) =>
  payments.some((item) => item.method === method)
const paymentCounters = { collection: 3, payment: 1 }
/** Dónde entró cada pago, para revertirlo al anular: sesión de caja o cuenta bancaria */
const paymentDestination = new Map<string, { cashSessionId?: string; bankAccountId?: string }>()

// ---------------------------------------------------------------- Estados de cuenta

function buildStatement(partyType: string, partyId: string, from: string, to: string): Statement | undefined {
  type Movement = { date: string; type: Statement["lines"][number]["type"]; document_code: string; debit: number; credit: number }
  const movements: Movement[] = []
  let party: { name: string; document: string } | undefined

  if (partyType === "customer") {
    const customer = CUSTOMERS.find((c) => customerRef(c.n) === partyId)
    if (!customer) return undefined
    party = { name: customer.name, document: `${customer.document_type} ${customer.document_number}` }
    const invoices = currentSalesInvoices().filter((i) => i.customer_id === partyId && i.status !== "void")
    for (const invoice of invoices) {
      movements.push({ date: invoice.issue_date, type: "invoice", document_code: `${invoice.series}-${invoice.number}`, debit: toCents(invoice.total), credit: 0 })
    }
    for (const salesReturn of currentSalesReturns().filter((r) => r.status === "confirmed" && invoices.some((i) => i.id === r.invoice_id))) {
      movements.push({ date: salesReturn.created_at.slice(0, 10), type: "credit_note", document_code: salesReturn.number, debit: 0, credit: toCents(salesReturn.total) })
    }
  } else {
    const supplier = SUPPLIERS.find((s) => supplierRef(s.n) === partyId)
    if (!supplier) return undefined
    party = { name: supplier.name, document: `${supplier.document_type} ${supplier.document_number}` }
    for (const invoice of currentSupplierInvoices().filter((i) => i.supplier_id === partyId && i.status !== "void")) {
      movements.push({ date: invoice.issue_date, type: "invoice", document_code: `${invoice.series}-${invoice.number}`, debit: toCents(invoice.total), credit: 0 })
    }
  }
  for (const p of payments.filter((candidate) => candidate.party_id === partyId && candidate.status === "executed")) {
    for (const application of p.applications) {
      movements.push({ date: p.payment_date, type: "payment", document_code: p.number, debit: 0, credit: toCents(application.amount) })
    }
  }
  movements.sort((a, b) => a.date.localeCompare(b.date) || b.debit - a.debit)

  const opening = movements.filter((m) => m.date < from).reduce((sum, m) => sum + m.debit - m.credit, 0)
  let running = opening
  const lines = movements
    .filter((m) => m.date >= from && m.date <= to)
    .map((m) => {
      running += m.debit - m.credit
      return { date: m.date, type: m.type, document_code: m.document_code, debit: fromCents(m.debit), credit: fromCents(m.credit), balance: fromCents(running) }
    })
  return {
    party_name: party.name,
    party_document: party.document,
    date_from: from,
    date_to: to,
    opening_balance: fromCents(opening),
    lines,
    closing_balance: fromCents(running),
  }
}

let instruments: FinancialInstrument[] = [
  { id: uuid("8068", 1), type: "letter", number: "LE-000034", third_party: "Comercial Andina", amount: "1500.00", issue_date: "2026-09-10", due_date: "2026-11-10", status: "pending" },
  { id: uuid("8068", 2), type: "check", number: "CH-000021", third_party: "Distribuidora Central", amount: "780.00", issue_date: "2026-09-20", due_date: "2026-10-20", status: "paid" },
]
let taxes: TaxRecord[] = [
  { id: uuid("8069", 1), tax_type: "IGV", period: "2026-09", base: "12000.00", amount: "2160.00", document_origin: "REG-2026-09", status: "pending" },
  { id: uuid("8069", 2), tax_type: "Impuesto a la renta", period: "2026-08", base: "8500.00", amount: "425.00", document_origin: "REG-2026-08", status: "paid" },
]
let instrumentCounter = instruments.length
let taxCounter = taxes.length

/** Cuentas vigentes (con estado calculado), para que los mocks de Dashboard y Reportes lean lo mismo */
export const financeSnapshot = () => {
  syncFinancialAccounts()
  return {
    receivables: receivables.map(withStatus),
    payables: payables.map(withStatus),
  }
}

// ---------------------------------------------------------------- Handlers

const listOf = <T,>(items: T[], request: Request, options: Parameters<typeof applyListFilters<T>>[2]) => {
  const params = new URL(request.url).searchParams
  const result = applyListFilters(items, params, options)
  return result.ok ? HttpResponse.json(paginate(result.items, params)) : errorResponse(result.status, result.code, result.message)
}

export const financeHandlers: RequestHandler[] = [
  http.get(base("receivables"), async ({ request }) => {
    await delay(300)
    syncFinancialAccounts()
    return listOf(receivables.map(withStatus) as Receivable[], request, {
      searchFields: ["customer_name", "invoice_code"],
      filterFields: ["customer_id", "status"],
      dateField: "due_date",
    })
  }),

  http.get(base("payables"), async ({ request }) => {
    await delay(300)
    syncFinancialAccounts()
    return listOf(payables.map(withStatus) as Payable[], request, {
      searchFields: ["supplier_name", "invoice_code"],
      filterFields: ["supplier_id", "status"],
      dateField: "due_date",
    })
  }),

  http.get(base("payments"), async ({ request }) => {
    await delay(300)
    const documentId = new URL(request.url).searchParams.get("document_id")
    const filtered = documentId
      ? payments.filter((payment) => payment.applications.some((application) => application.document_id === documentId))
      : payments
    return listOf(filtered, request, {
      searchFields: ["number", "party_name", "document_code", "operation_number"],
      filterFields: ["type", "method", "status"],
      dateField: "payment_date",
    })
  }),

  http.get(base("instruments"), async ({ request }) => {
    await delay(200)
    return listOf(instruments, request, {
      searchFields: ["number", "third_party"],
      filterFields: ["type", "status"],
      dateField: "due_date",
    })
  }),

  http.post(base("instruments"), async ({ request }) => {
    await delay(250)
    const parsed = instrumentInputSchema.safeParse(await readBody(request))
    if (!parsed.success) return validation(parsed.error.issues)
    if (instruments.some((instrument) => instrument.number === parsed.data.number)) {
      return errorResponse(409, "DUPLICATE_INSTRUMENT", "Ya existe un instrumento con ese número.")
    }
    instrumentCounter += 1
    const created: FinancialInstrument = { ...parsed.data, id: uuid("8068", instrumentCounter), status: "pending" }
    instruments = [created, ...instruments]
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(base("instruments/:id/status"), async ({ request, params }) => {
    await delay(200)
    const current = instruments.find((instrument) => instrument.id === params.id)
    if (!current) return notFound()
    const body = await readBody(request)
    if (body.status !== "paid" && body.status !== "void") return errorResponse(422, "VALIDATION_ERROR", "Estado de instrumento no válido.")
    if (current.status !== "pending") return errorResponse(409, "INVALID_TRANSITION", "El instrumento ya no está pendiente.")
    const updated: FinancialInstrument = { ...current, status: body.status }
    instruments = instruments.map((instrument) => (instrument.id === current.id ? updated : instrument))
    return HttpResponse.json(updated)
  }),

  http.get(base("taxes"), async ({ request }) => {
    await delay(200)
    return listOf(taxes, request, {
      searchFields: ["tax_type", "period", "document_origin"],
      filterFields: ["status", "period"],
      dateField: "period",
    })
  }),

  http.post(base("taxes"), async ({ request }) => {
    await delay(250)
    const parsed = taxInputSchema.safeParse(await readBody(request))
    if (!parsed.success) return validation(parsed.error.issues)
    if (taxes.some((tax) => tax.tax_type === parsed.data.tax_type && tax.period === parsed.data.period)) {
      return errorResponse(409, "DUPLICATE_TAX", "Ya existe un registro de ese tributo para el periodo indicado.")
    }
    taxCounter += 1
    const created: TaxRecord = { ...parsed.data, id: uuid("8069", taxCounter), status: "pending" }
    taxes = [created, ...taxes]
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(base("taxes/:id/status"), async ({ request, params }) => {
    await delay(200)
    const current = taxes.find((tax) => tax.id === params.id)
    if (!current) return notFound()
    const body = await readBody(request)
    if (body.status !== "paid") return errorResponse(422, "VALIDATION_ERROR", "Estado tributario no válido.")
    if (current.status !== "pending") return errorResponse(409, "INVALID_TRANSITION", "El tributo ya está pagado.")
    const updated: TaxRecord = { ...current, status: "paid" }
    taxes = taxes.map((tax) => (tax.id === current.id ? updated : tax))
    return HttpResponse.json(updated)
  }),

  http.post(base("payments"), async ({ request }) => {
    await delay(300)
    const body = await readBody(request)
    const documentType = String(body.document_type ?? "")
    const rawApplications = Array.isArray(body.applications)
      ? body.applications
      : [{ document_id: body.document_id, amount: body.amount }]
    const applications = rawApplications.filter(
      (application): application is { document_id: string; amount: string } =>
        typeof application === "object" &&
        application !== null &&
        "document_id" in application &&
        typeof application.document_id === "string" &&
        "amount" in application &&
        typeof application.amount === "string",
    )
    const targets = applications.map((application) => ({
      application,
      target: documentBalance(documentType, application.document_id),
    }))
    const balances: Record<string, string> = {}
    for (const { application, target } of targets) {
      if (!target) return errorResponse(422, "VALIDATION_ERROR", "Uno de los documentos no existe o ya no admite pagos.")
      const reserved = payments
        .filter((payment) => payment.status === "registered" || payment.status === "approved")
        .flatMap((payment) => payment.applications)
        .filter((existing) => existing.document_id === application.document_id)
        .reduce((sum, existing) => sum + toCents(existing.amount), 0)
      balances[application.document_id] = fromCents(Math.max(0, toCents(target.balance) - reserved))
    }
    const parsed = paymentInputSchema({ balances, today: todayInLima() }).safeParse({ ...body, applications })
    if (!parsed.success) return validation(parsed.error.issues)
    const input = parsed.data
    const firstTarget = targets[0]?.target
    if (!firstTarget || targets.some(({ target }) => target?.party_id !== firstTarget.party_id)) {
      return errorResponse(422, "VALIDATION_ERROR", "Todas las aplicaciones deben pertenecer al mismo cliente o proveedor.")
    }

    if (
      input.method === "transfer" &&
      !bankAccounts.some((account) => account.id === input.bank_account_id && account.status === "active" && account.currency === "PEN")
    ) {
      return errorResponse(422, "VALIDATION_ERROR", "Elige una cuenta bancaria activa en PEN.", [{ field: "bank_account_id", message: "Elige una cuenta bancaria activa en PEN" }])
    }

    paymentCounters[input.type] += 1
    const created: Payment = {
      ...input,
      id: newId(),
      number: nextNumber(input.type === "collection" ? "CB" : "PG", paymentCounters[input.type]),
      document_id: input.applications[0].document_id,
      document_code: targets[0].target!.code,
      amount: fromCents(input.applications.reduce((sum, application) => sum + toCents(application.amount), 0)),
      applications: input.applications.map((application, index) => ({
        ...application,
        document_code: targets[index].target!.code,
      })),
      party_id: firstTarget.party_id,
      party_name: firstTarget.party_name,
      bank_account_label: input.method === "transfer" ? accountLabel(input.bank_account_id) : "",
      status: "registered",
      void_reason: "",
      created_at: new Date().toISOString(),
    }
    payments = [created, ...payments]
    return HttpResponse.json(created, { status: 201 })
  }),

  http.post(base("payments/:id/approve"), async ({ params }) => {
    await delay(250)
    const current = payments.find((payment) => payment.id === params.id)
    if (!current) return notFound()
    if (current.status !== "registered") return errorResponse(409, "INVALID_TRANSITION", "Solo se pueden aprobar cobros o pagos registrados.")
    const updated: Payment = { ...current, status: "approved" }
    payments = payments.map((payment) => (payment.id === current.id ? updated : payment))
    return HttpResponse.json(updated)
  }),

  http.post(base("payments/:id/execute"), async ({ params }) => {
    await delay(300)
    const current = payments.find((payment) => payment.id === params.id)
    if (!current) return notFound()
    if (current.status !== "approved") return errorResponse(409, "INVALID_TRANSITION", "Solo se pueden ejecutar cobros o pagos aprobados.")
    const currentTargets = current.applications.map((application) => ({
      application,
      target: documentBalance(current.document_type, application.document_id),
    }))
    if (currentTargets.some(({ application, target }) => !target || toCents(application.amount) > toCents(target.balance))) {
      return errorResponse(409, "INSUFFICIENT_BALANCE", "El saldo del documento cambió y ya no cubre este cobro o pago.")
    }
    const target = currentTargets[0]?.target
    if (!target) return errorResponse(409, "INSUFFICIENT_BALANCE", "El documento ya no admite pagos.")

    const openSession = cashSessions.find((session) => session.status === "open")
    if (current.method === "cash" && !openSession) {
      return errorResponse(409, "CASH_CLOSED", "No hay una caja abierta: abre una sesión de caja para ejecutar efectivo.")
    }
    if (
      current.method === "transfer" &&
      !bankAccounts.some((account) => account.id === current.bank_account_id && account.status === "active" && account.currency === "PEN")
    ) {
      return errorResponse(409, "ACCOUNT_INACTIVE", "La cuenta bancaria no está activa.")
    }

    const updated: Payment = { ...current, status: "executed" }
    payments = payments.map((payment) => (payment.id === current.id ? updated : payment))
    for (const application of updated.applications) {
      addPaidToAccount(application.document_id, toCents(application.amount))
    }
    const concept = `${updated.type === "collection" ? "Cobro" : "Pago"} ${target.code} (${target.party_name})`
    const direction = updated.type === "collection" ? "income" : "expense"
    if (updated.method === "cash" && openSession) {
      addCashMovement(openSession.id, direction, concept, updated.amount, "payment")
      paymentDestination.set(updated.id, { cashSessionId: openSession.id })
    }
    if (updated.method === "transfer") {
      addBankMovement(updated.bank_account_id, direction, concept, updated.amount, updated.payment_date, "payment")
      paymentDestination.set(updated.id, { bankAccountId: updated.bank_account_id })
    }
    return HttpResponse.json(updated)
  }),

  http.post(base("payments/:id/void"), async ({ request, params }) => {
    await delay(300)
    const parsed = reasonSchema.safeParse(await readBody(request))
    if (!parsed.success) return validation(parsed.error.issues)
    const current = payments.find((p) => p.id === params.id)
    if (!current) return notFound()
    if (current.status === "void") return errorResponse(409, "INVALID_TRANSITION", "El pago ya está anulado.")
    const destination = paymentDestination.get(current.id)
    const session = destination?.cashSessionId ? cashSessions.find((s) => s.id === destination.cashSessionId) : undefined
    if (session && session.status !== "open") {
      return errorResponse(409, "SESSION_CLOSED", "El cobro entró a una caja ya cerrada: anúlalo con un egreso en la caja abierta.")
    }
    const updated: Payment = { ...current, status: "void", void_reason: parsed.data.reason }
    payments = payments.map((p) => (p.id === current.id ? updated : p))
    if (current.status === "executed") {
      for (const application of current.applications) {
        addPaidToAccount(application.document_id, -toCents(application.amount))
      }
      const reverse = current.type === "collection" ? "expense" : "income"
      const concept = `Anulación ${current.number} (${current.document_code})`
      if (session) addCashMovement(session.id, reverse, concept, current.amount, "payment")
      if (destination?.bankAccountId) addBankMovement(destination.bankAccountId, reverse, concept, current.amount, todayInLima(), "payment")
    }
    return HttpResponse.json(updated)
  }),

  http.get(base("cash/registers"), async () => {
    await delay(200)
    const items = registers.map((register) => ({ ...register, open_session_id: openSessionOf(register.id)?.id ?? "" }))
    return HttpResponse.json(paginate(items, new URLSearchParams()))
  }),

  http.get(base("cash/sessions"), async ({ request }) => {
    await delay(300)
    return listOf([...cashSessions].sort((a, b) => b.opened_at.localeCompare(a.opened_at)), request, {
      searchFields: ["number", "register_name"],
      filterFields: ["status", "register_id"],
      dateField: "opened_at",
    })
  }),

  http.get(base("cash/sessions/:id"), async ({ params }) => {
    await delay(200)
    const session = cashSessions.find((candidate) => candidate.id === params.id)
    return session ? HttpResponse.json(session) : notFound()
  }),

  http.post(base("cash/sessions"), async ({ request }) => {
    await delay(300)
    const parsed = openSessionSchema.safeParse(await readBody(request))
    if (!parsed.success) return validation(parsed.error.issues)
    const register = registers.find((candidate) => candidate.id === parsed.data.register_id)
    if (!register) return errorResponse(422, "VALIDATION_ERROR", "Elige una caja.")
    if (openSessionOf(register.id)) return errorResponse(409, "SESSION_ALREADY_OPEN", "Esta caja ya tiene una sesión abierta.")
    cashCounter += 1
    const session: CashSession = {
      id: newId(),
      number: nextNumber("CAJA", cashCounter),
      register_id: register.id,
      register_name: register.name,
      status: "open",
      opened_at: new Date().toISOString(),
      opened_by_name: "Usuario en sesión",
      opening_amount: parsed.data.opening_amount,
      expected_amount: parsed.data.opening_amount,
      counted_amount: "",
      difference: "",
      closing_note: "",
      closed_at: "",
      movements: [],
    }
    cashSessions = [session, ...cashSessions]
    return HttpResponse.json(session, { status: 201 })
  }),

  http.post(base("cash/sessions/:id/movements"), async ({ request, params }) => {
    await delay(300)
    const session = cashSessions.find((candidate) => candidate.id === params.id)
    if (!session) return notFound()
    if (session.status !== "open") return errorResponse(409, "SESSION_CLOSED", "La sesión está cerrada: es solo lectura.")
    const parsed = cashMovementInputSchema.safeParse(await readBody(request))
    if (!parsed.success) return validation(parsed.error.issues)
    if (parsed.data.type === "expense" && toCents(parsed.data.amount) > toCents(session.expected_amount)) {
      return errorResponse(409, "INSUFFICIENT_CASH", "No hay suficiente efectivo en caja para ese egreso.")
    }
    return HttpResponse.json(addCashMovement(session.id, parsed.data.type, parsed.data.concept, parsed.data.amount, "manual"))
  }),

  http.post(base("cash/sessions/:id/close"), async ({ request, params }) => {
    await delay(300)
    const session = cashSessions.find((candidate) => candidate.id === params.id)
    if (!session) return notFound()
    if (session.status !== "open") return errorResponse(409, "INVALID_TRANSITION", "La sesión ya está cerrada.")
    const parsed = closeSessionSchema(session.expected_amount).safeParse(await readBody(request))
    if (!parsed.success) return validation(parsed.error.issues)
    const closed: CashSession = {
      ...session,
      status: "closed",
      counted_amount: parsed.data.counted_amount,
      difference: fromCents(toCents(parsed.data.counted_amount) - toCents(session.expected_amount)),
      closing_note: parsed.data.note,
      closed_at: new Date().toISOString(),
    }
    cashSessions = cashSessions.map((candidate) => (candidate.id === session.id ? closed : candidate))
    return HttpResponse.json(closed)
  }),

  http.get(base("bank-accounts/:id/movements"), async ({ request, params }) => {
    await delay(300)
    if (!bankAccounts.some((account) => account.id === params.id)) return notFound()
    return listOf(bankMovements.filter((m) => m.account_id === params.id), request, {
      searchFields: ["concept"],
      filterFields: ["type", "source"],
      dateField: "movement_date",
    })
  }),

  http.post(base("bank-accounts/:id/movements"), async ({ request, params }) => {
    await delay(300)
    const account = bankAccounts.find((candidate) => candidate.id === params.id)
    if (!account) return notFound()
    if (account.status !== "active") return errorResponse(409, "ACCOUNT_INACTIVE", "La cuenta está inactiva.")
    const parsed = bankMovementInputSchema(todayInLima()).safeParse(await readBody(request))
    if (!parsed.success) return validation(parsed.error.issues)
    const { type, concept, amount, movement_date } = parsed.data
    return HttpResponse.json(addBankMovement(account.id, type, concept, amount, movement_date, "manual"), { status: 201 })
  }),

  http.patch(base("bank-accounts/:id/movements/:movementId"), async ({ request, params }) => {
    await delay(200)
    const body = await readBody(request)
    if (typeof body.reconciled !== "boolean") return errorResponse(400, "BAD_REQUEST", "Indica si está conciliado.")
    const current = bankMovements.find((m) => m.id === params.movementId && m.account_id === params.id)
    if (!current) return notFound()
    const updated = { ...current, reconciled: body.reconciled }
    bankMovements = bankMovements.map((m) => (m.id === current.id ? updated : m))
    return HttpResponse.json(updated)
  }),

  // Cuentas bancarias: catálogo con la fábrica común (número único, con movimientos no se borra)
  ...createCrudHandlers<BankAccount>({
    resource: "finance/bank-accounts",
    seed: bankAccountSeed,
    searchFields: ["bank", "number"],
    filterFields: ["status", "currency"],
    insertAt: "start",
    uniqueFields: [{ field: "number", label: "número de cuenta" }],
    createdFields: { balance: "0.00" },
    immutableFields: ["balance"],
    isInUse: (account) => bankMovements.some((m) => m.account_id === account.id),
    inUseMessage: "La cuenta tiene movimientos y no se puede eliminar. Puedes desactivarla.",
    validate: ({ next }) => {
      if (!next) return undefined
      const parsed = bankAccountInputSchema.safeParse(next)
      return parsed.success ? undefined : { status: 422, code: "VALIDATION_ERROR", message: "Revisa los datos ingresados." }
    },
    // Altas y ediciones del catálogo se reflejan aquí; el saldo lo siguen llevando los movimientos
    onChange: (items) => {
      const balances = new Map(bankAccounts.map((account) => [account.id, account.balance]))
      bankAccounts = items.map((item) => ({ ...item, balance: balances.get(item.id) ?? item.balance }))
    },
  }),

  http.get(base("statements"), async ({ request }) => {
    await delay(300)
    const params = Object.fromEntries(new URL(request.url).searchParams)
    const parsed = statementQuerySchema.safeParse(params)
    if (!parsed.success) return validation(parsed.error.issues)
    const statement = buildStatement(parsed.data.party_type, parsed.data.party_id, parsed.data.date_from, parsed.data.date_to)
    return statement ? HttpResponse.json(statement) : notFound()
  }),
]
