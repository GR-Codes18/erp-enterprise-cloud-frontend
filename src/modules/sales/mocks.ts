import { PRODUCTS, customerRef, findCustomer, productName, productRef, warehouseRef } from "@/mocks/refs"
import { createDocumentHandlers, nextNumber, totalsOf } from "@/mocks/utils/documents"
import { applyInventoryMovement, getAvailableQuantity } from "@/modules/inventory/state"
import { addDays, todayInLima } from "@/shared/lib/dates"
import { fromCents, toCents } from "@/shared/lib/money"
import { canIssueAs, issueInvoiceSchema, type Invoice } from "./invoices/schema"
import { orderInputSchema, type Order, type OrderInput } from "./orders/schema"
import { quoteInputSchema, type Quote, type QuoteInput } from "./quotes/schema"
import { returnInputSchema, returnQuantityErrors, type ReturnInput, type SalesReturn } from "./returns/schema"

/** UUID fijos por recurso: cotizaciones 8040, pedidos 8041, comprobantes 8042, devoluciones 8043 */
const uuid = (prefix: string, n: number) => `00000000-0000-4000-${prefix}-${String(n).padStart(12, "0")}`
const quoteId = (n: number) => uuid("8040", n)
const orderId = (n: number) => uuid("8041", n)
const invoiceId = (n: number) => uuid("8042", n)
const returnId = (n: number) => uuid("8043", n)

type Line = { product_id: string; warehouse_id: string; warehouse_name?: string; quantity: number; unit_price: string }

const WAREHOUSE_NAMES: Record<string, string> = {
  [warehouseRef(1)]: "Almacén Central Principal",
  [warehouseRef(2)]: "Almacén de Materia Prima",
  [warehouseRef(3)]: "Almacén de Productos Terminados",
  [warehouseRef(4)]: "Depósito San Juan de Lurigancho",
  [warehouseRef(5)]: "Almacén Sur Villa El Salvador",
  [warehouseRef(6)]: "Almacén Norte Los Olivos",
  [warehouseRef(8)]: "Almacén Repuestos y Herramientas",
  [warehouseRef(10)]: "Almacén Auxiliar Ate",
}

const warehouseName = (id: string) => WAREHOUSE_NAMES[id] ?? "Almacén registrado en esta sesión"

/** Línea con el precio de venta del producto semilla */
const line = (productN: number, quantity: number, unit_price?: string, warehouseN: number = 1): Line => ({
  product_id: productRef(productN),
  warehouse_id: warehouseRef(warehouseN),
  warehouse_name: warehouseName(warehouseRef(warehouseN)),
  quantity,
  unit_price: unit_price ?? PRODUCTS.find((p) => p.n === productN)?.sale_price ?? "0.00",
})
const withNames = (lines: readonly Line[]) =>
  lines.map((item) => ({ ...item, product_name: productName(item.product_id), warehouse_name: warehouseName(item.warehouse_id) }))
const customerName = (id: string) => findCustomer(id)?.name ?? "Cliente registrado en esta sesión"

// ---------------------------------------------------------------- Cotizaciones

function makeQuote(n: number, input: QuoteInput, status: Quote["status"], extra: Partial<Quote> = {}): Quote {
  return {
    ...input,
    id: quoteId(n),
    number: nextNumber("COT", n),
    customer_name: customerName(input.customer_id),
    items: withNames(input.items),
    status,
    ...totalsOf(input.items),
    order_id: "",
    rejection_reason: "",
    created_at: `${input.issue_date}T14:00:00Z`,
    ...extra,
  }
}

const quoteSeed: Quote[] = [
  makeQuote(1, { customer_id: customerRef(1), issue_date: "2026-09-20", valid_until: "2026-10-05", items: [line(1, 10), line(3, 20)], notes: "" }, "accepted", { order_id: orderId(1) }),
  makeQuote(2, { customer_id: customerRef(2), issue_date: "2026-10-01", valid_until: "2026-10-16", items: [line(5, 15), line(6, 10)], notes: "Entrega en almacén del cliente." }, "accepted"),
  makeQuote(3, { customer_id: customerRef(8), issue_date: "2026-10-03", valid_until: "2026-10-18", items: [line(4, 500), line(3, 40)], notes: "" }, "sent"),
  makeQuote(4, { customer_id: customerRef(10), issue_date: "2026-10-07", valid_until: "2026-10-22", items: [line(11, 4)], notes: "" }, "draft"),
  makeQuote(5, { customer_id: customerRef(4), issue_date: "2026-09-15", valid_until: "2026-09-30", items: [line(7, 3)], notes: "" }, "rejected", { rejection_reason: "El cliente consiguió un mejor precio." }),
  makeQuote(6, { customer_id: customerRef(11), issue_date: "2026-09-01", valid_until: "2026-09-16", items: [line(2, 2)], notes: "" }, "expired"),
  makeQuote(7, { customer_id: customerRef(3), issue_date: "2026-10-02", valid_until: "2026-10-17", items: [line(8, 6), line(10, 1)], notes: "" }, "sent"),
  makeQuote(8, { customer_id: customerRef(7), issue_date: "2026-10-04", valid_until: "2026-10-19", items: [line(9, 2)], notes: "Precio especial por volumen." }, "draft"),
  makeQuote(9, { customer_id: customerRef(1), issue_date: "2026-10-05", valid_until: "2026-10-20", items: [line(1, 5), line(2, 5)], notes: "" }, "sent"),
  makeQuote(10, { customer_id: customerRef(6), issue_date: "2026-08-20", valid_until: "2026-09-04", items: [line(6, 4)], notes: "" }, "expired"),
  makeQuote(11, { customer_id: customerRef(2), issue_date: "2026-10-06", valid_until: "2026-10-21", items: [line(3, 100)], notes: "" }, "draft"),
  makeQuote(12, { customer_id: customerRef(8), issue_date: "2026-09-25", valid_until: "2026-10-10", items: [line(5, 30)], notes: "" }, "rejected", { rejection_reason: "Proyecto postergado al próximo año." }),
]

// ---------------------------------------------------------------- Pedidos

function makeOrder(n: number, input: OrderInput, status: Order["status"], extra: Partial<Order> = {}): Order {
  const customer = findCustomer(input.customer_id)
  return {
    ...input,
    id: orderId(n),
    number: nextNumber("PED", n),
    customer_name: customerName(input.customer_id),
    customer_document_type: customer?.document_type ?? "DNI",
    quote_number: "",
    items: withNames(input.items),
    status,
    ...totalsOf(input.items),
    invoice_id: "",
    cancel_reason: "",
    created_at: "2026-10-01T15:00:00Z",
    ...extra,
  }
}

const cash = { payment_condition: "cash" as const, credit_days: 0 }
const credit = (days: number) => ({ payment_condition: "credit" as const, credit_days: days })

const orderSeed: Order[] = [
  makeOrder(1, { customer_id: customerRef(1), quote_id: quoteId(1), items: quoteSeed[0].items.map(({ product_id, warehouse_id, quantity, unit_price }) => ({ product_id, warehouse_id, quantity, unit_price })), ...credit(10), notes: "" }, "invoiced", { quote_number: quoteSeed[0].number, invoice_id: invoiceId(1), created_at: "2026-09-22T15:00:00Z" }),
  makeOrder(2, { customer_id: customerRef(3), quote_id: "", items: [line(6, 4), line(8, 2)], ...cash, notes: "" }, "invoiced", { invoice_id: invoiceId(2), created_at: "2026-09-28T15:00:00Z" }),
  makeOrder(3, { customer_id: customerRef(2), quote_id: "", items: [line(3, 30), line(4, 200)], ...credit(15), notes: "Coordinar despacho con almacén." }, "confirmed", { created_at: "2026-10-05T15:00:00Z" }),
  makeOrder(4, { customer_id: customerRef(10), quote_id: "", items: [line(11, 2)], ...cash, notes: "" }, "draft", { created_at: "2026-10-07T15:00:00Z" }),
  makeOrder(5, { customer_id: customerRef(11), quote_id: "", items: [line(2, 3)], ...cash, notes: "" }, "cancelled", { cancel_reason: "El cliente anuló la compra.", created_at: "2026-09-30T15:00:00Z" }),
  // A crédito por encima de su límite (S/ 800): al confirmar responde 409, usando el almacén con stock disponible
  makeOrder(6, { customer_id: customerRef(3), quote_id: "", items: [line(7, 15, undefined, 3)], ...credit(30), notes: "" }, "draft", { created_at: "2026-10-06T15:00:00Z" }),
  makeOrder(7, { customer_id: customerRef(4), quote_id: "", items: [line(1, 1), line(10, 2)], ...cash, notes: "" }, "confirmed", { created_at: "2026-10-06T16:00:00Z" }),
  // Pide más cable del que hay (15): al confirmar responde 409 con el faltante
  makeOrder(8, { customer_id: customerRef(8), quote_id: "", items: [line(9, 20)], ...credit(30), notes: "" }, "draft", { created_at: "2026-10-07T16:00:00Z" }),
  makeOrder(9, { customer_id: customerRef(8), quote_id: "", items: [line(5, 10), line(6, 10)], ...credit(30), notes: "" }, "invoiced", { invoice_id: invoiceId(3), created_at: "2026-10-02T15:00:00Z" }),
  makeOrder(10, { customer_id: customerRef(2), quote_id: "", items: [line(3, 10)], ...cash, notes: "" }, "invoiced", { invoice_id: invoiceId(4), created_at: "2026-09-10T15:00:00Z" }),
  makeOrder(11, { customer_id: customerRef(7), quote_id: "", items: [line(10, 3)], ...cash, notes: "" }, "invoiced", { invoice_id: invoiceId(5), created_at: "2026-09-12T15:00:00Z" }),
]

// ---------------------------------------------------------------- Comprobantes

function makeInvoice(
  n: number,
  order: Order,
  type: Invoice["type"],
  number: string,
  issue_date: string,
  paid: string,
  status: Invoice["status"],
  extra: Partial<Invoice> = {},
): Invoice {
  const customer = findCustomer(order.customer_id)
  return {
    id: invoiceId(n),
    type,
    series: type === "invoice" ? "F001" : "B001",
    number,
    order_id: order.id,
    order_number: order.number,
    customer_id: order.customer_id,
    customer_name: order.customer_name,
    customer_document: customer ? `${customer.document_type} ${customer.document_number}` : "",
    issue_date,
    due_date: order.payment_condition === "credit" ? addDays(issue_date, order.credit_days) : "",
    payment_condition: order.payment_condition,
    items: order.items.map((item) => ({ ...item, returned_quantity: 0 })),
    subtotal: order.subtotal,
    igv: order.igv,
    total: order.total,
    paid,
    balance: fromCents(toCents(order.total) - toCents(paid)),
    status,
    void_reason: "",
    created_at: `${issue_date}T16:00:00Z`,
    ...extra,
  }
}

const invoiceSeed: Invoice[] = [
  makeInvoice(1, orderSeed[0], "invoice", "00000101", "2026-09-23", "300.00", "partially_paid"),
  makeInvoice(2, orderSeed[1], "receipt", "00000201", "2026-09-28", orderSeed[1].total, "paid"),
  makeInvoice(3, orderSeed[8], "invoice", "00000102", "2026-10-02", "0.00", "issued"),
  makeInvoice(4, orderSeed[9], "invoice", "00000100", "2026-09-10", orderSeed[9].total, "paid"),
  makeInvoice(5, orderSeed[10], "receipt", "00000200", "2026-09-12", "0.00", "void", { void_reason: "Error en el nombre del cliente; se volvió a emitir." }),
]
// La boleta 2 tiene una devolución confirmada de 1 paquete de guantes
invoiceSeed[1].items = invoiceSeed[1].items.map((item) =>
  item.product_id === productRef(6) ? { ...item, returned_quantity: 1 } : item,
)

// ---------------------------------------------------------------- Devoluciones

function makeReturn(n: number, input: ReturnInput, status: SalesReturn["status"], created_at: string): SalesReturn {
  const invoice = invoiceSeed.find((candidate) => candidate.id === input.invoice_id)
  return buildReturn(returnId(n), nextNumber("DEV", n), input, status, created_at, invoice)
}

function buildReturn(
  id: string,
  number: string,
  input: ReturnInput,
  status: SalesReturn["status"],
  created_at: string,
  invoice: Invoice | undefined,
): SalesReturn {
  const items = input.items.map((item) => ({
    ...item,
    product_name: productName(item.product_id),
    unit_price: invoice?.items.find((candidate) => candidate.product_id === item.product_id)?.unit_price ?? "0.00",
  }))
  return {
    id,
    number,
    invoice_id: input.invoice_id,
    invoice_code: invoice ? `${invoice.series}-${invoice.number}` : "",
    customer_name: invoice?.customer_name ?? "",
    items,
    reason: input.reason,
    status,
    total: totalsOf(items).total,
    created_at,
  }
}

const returnSeed: SalesReturn[] = [
  makeReturn(1, { invoice_id: invoiceId(2), items: [{ product_id: productRef(6), quantity: 1 }], reason: "Talla equivocada." }, "confirmed", "2026-09-30T15:00:00Z"),
  makeReturn(2, { invoice_id: invoiceId(1), items: [{ product_id: productRef(3), quantity: 2 }], reason: "Bolsas de cemento rotas en el transporte." }, "draft", "2026-10-07T15:00:00Z"),
]

// ---------------------------------------------------------------- Handlers

let quoteCounter = quoteSeed.length
let orderCounter = orderSeed.length
let returnCounter = returnSeed.length
const invoiceCounters = { invoice: 102, receipt: 201 }

const quotes = createDocumentHandlers<Quote, QuoteInput, Quote["status"]>({
  resource: "sales/quotes",
  seed: quoteSeed,
  searchFields: ["number", "customer_name"],
  filterFields: ["status", "customer_id"],
  dateField: "issue_date",
  inputSchema: quoteInputSchema,
  createRecord: (input, id, created_at) => {
    quoteCounter += 1
    return { ...makeQuote(quoteCounter, input, "draft"), id, created_at }
  },
  updateRecord: (current, input) => ({
    ...current,
    ...input,
    customer_name: customerName(input.customer_id),
    items: withNames(input.items),
    ...totalsOf(input.items),
  }),
  actions: [
    { action: "send", from: ["draft"], to: "sent" },
    { action: "accept", from: ["sent"], to: "accepted" },
    { action: "reject", from: ["sent"], to: "rejected", requiresReason: true, apply: (_q, body) => ({ rejection_reason: String(body.reason).trim() }) },
    {
      action: "convert",
      from: ["accepted"],
      to: "accepted",
      check: (quote) =>
        quote.order_id
          ? { status: 409, code: "ALREADY_CONVERTED", message: "Esta cotización ya se convirtió en un pedido." }
          : undefined,
      // Efecto dentro de Ventas: nace el pedido en borrador y la cotización lo referencia
      respond: (quote) => {
        orderCounter += 1
        const order = makeOrder(
          orderCounter,
          {
            customer_id: quote.customer_id,
            quote_id: quote.id,
            items: quote.items.map(({ product_id, warehouse_id, quantity, unit_price }) => ({ product_id, warehouse_id, quantity, unit_price })),
            ...cash,
            notes: quote.notes,
          },
          "draft",
          { id: crypto.randomUUID(), quote_number: quote.number, created_at: new Date().toISOString() },
        )
        orders.store.insert(order)
        quotes.store.update(quote.id, { order_id: order.id })
        return order
      },
    },
  ],
})

/** Lo que el backend comprobaría al confirmar: cliente activo, stock y límite de crédito */
function checkOrderCanBeConfirmed(order: Order) {
  const customer = findCustomer(order.customer_id)
  if (customer && !customer.active) {
    return { status: 409, code: "CUSTOMER_INACTIVE", message: "El cliente está inactivo: no se le puede vender." }
  }
  if (order.payment_condition === "credit" && customer) {
    // Saldo pendiente del cliente (comprobantes vigentes con deuda) + este pedido <= límite
    const pending = invoices.store
      .all()
      .filter((invoice) => invoice.customer_id === order.customer_id && invoice.status !== "void")
      .reduce((sum, invoice) => sum + toCents(invoice.balance), 0)
    if (pending + toCents(order.total) > toCents(customer.credit_limit)) {
      return { status: 409, code: "CREDIT_LIMIT_EXCEEDED", message: "Excede el límite de crédito del cliente." }
    }
  }
  const shortages = order.items.flatMap((item) => {
    const available = getAvailableQuantity(item.product_id, item.warehouse_id)
    return item.quantity > available
      ? [`${productName(item.product_id)} (disponible ${available}, pedido ${item.quantity})`]
      : []
  })
  if (shortages.length > 0) {
    return { status: 409, code: "INSUFFICIENT_STOCK", message: `Stock insuficiente: ${shortages.join("; ")}.` }
  }
  return undefined
}

const orders = createDocumentHandlers<Order, OrderInput, Order["status"]>({
  resource: "sales/orders",
  seed: orderSeed,
  searchFields: ["number", "customer_name"],
  filterFields: ["status", "customer_id", "payment_condition"],
  dateField: "created_at",
  inputSchema: orderInputSchema,
  createRecord: (input, id, created_at) => {
    orderCounter += 1
    const quote = quotes.store.find(input.quote_id)
    return { ...makeOrder(orderCounter, input, "draft", { quote_number: quote?.number ?? "" }), id, created_at }
  },
  updateRecord: (current, input) => ({
    ...makeOrder(0, input, current.status),
    id: current.id,
    number: current.number,
    quote_number: current.quote_number,
    created_at: current.created_at,
  }),
  actions: [
    {
      action: "confirm",
      from: ["draft"],
      to: "confirmed",
      check: checkOrderCanBeConfirmed,
      respond: (order) => {
        order.items.forEach((item) => {
          applyInventoryMovement({
            product_id: item.product_id,
            warehouse_id: item.warehouse_id,
            quantity: item.quantity,
            direction: "out",
            type: "sale",
            reference: order.number,
          })
        })
        return order
      },
    },
    { action: "cancel", from: ["draft", "confirmed"], to: "cancelled", requiresReason: true, apply: (_o, body) => ({ cancel_reason: String(body.reason).trim() }) },
    {
      action: "invoice",
      from: ["confirmed"],
      to: "invoiced",
      check: (order, body) => {
        const parsed = issueInvoiceSchema.safeParse(body)
        if (!parsed.success) return { status: 422, code: "VALIDATION_ERROR", message: "Elige factura o boleta." }
        if (!canIssueAs(parsed.data.type, order.customer_document_type)) {
          return { status: 422, code: "RUC_REQUIRED", message: "La factura exige un cliente con RUC. Emite una boleta." }
        }
        return undefined
      },
      // Efecto dentro de Ventas: nace el comprobante. Stock y cuenta por cobrar los hace el backend
      respond: (order, body) => {
        const type = issueInvoiceSchema.parse(body).type
        invoiceCounters[type] += 1
        const invoice = makeInvoice(0, order, type, String(invoiceCounters[type]).padStart(8, "0"), todayInLima(), "0.00", "issued", {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
        })
        invoices.store.insert(invoice)
        orders.store.update(order.id, { invoice_id: invoice.id })
        return invoice
      },
    },
  ],
})

const invoices = createDocumentHandlers<Invoice, never, Invoice["status"]>({
  resource: "sales/invoices",
  seed: invoiceSeed,
  searchFields: ["series", "number", "customer_name", "order_number"],
  filterFields: ["status", "type", "customer_id"],
  dateField: "issue_date",
  actions: [
    {
      action: "void",
      from: ["issued"],
      to: "void",
      requiresReason: true,
      check: (invoice) =>
        toCents(invoice.paid) > 0
          ? { status: 409, code: "HAS_PAYMENTS", message: "El comprobante tiene cobros: no se puede anular." }
          : undefined,
      apply: (_i, body) => ({ void_reason: String(body.reason).trim() }),
    },
  ],
})

/** Lo devuelto no puede superar lo vendido menos lo ya devuelto */
function checkReturnQuantities(input: ReturnInput) {
  const invoice = invoices.store.find(input.invoice_id)
  if (!invoice || invoice.status === "void") {
    return { status: 422, code: "VALIDATION_ERROR", message: "Elige un comprobante vigente." }
  }
  const errors = returnQuantityErrors(input.items, invoice.items).flatMap((message, index) =>
    message ? [{ field: `items.${index}.quantity`, message }] : [],
  )
  return errors.length > 0
    ? { status: 422, code: "VALIDATION_ERROR", message: "Revisa las cantidades a devolver.", errors }
    : undefined
}

const returns = createDocumentHandlers<SalesReturn, ReturnInput, SalesReturn["status"]>({
  resource: "sales/returns",
  seed: returnSeed,
  searchFields: ["number", "invoice_code", "customer_name"],
  filterFields: ["status", "invoice_id"],
  dateField: "created_at",
  inputSchema: returnInputSchema,
  createRecord: (input, id, created_at) => {
    const rejected = checkReturnQuantities(input)
    if (rejected) return rejected
    returnCounter += 1
    return buildReturn(id, nextNumber("DEV", returnCounter), input, "draft", created_at, invoices.store.find(input.invoice_id))
  },
  updateRecord: (current, input) =>
    checkReturnQuantities(input) ??
    buildReturn(current.id, current.number, input, "draft", current.created_at, invoices.store.find(input.invoice_id)),
  actions: [
    {
      action: "confirm",
      from: ["draft"],
      to: "confirmed",
      check: (salesReturn) => checkReturnQuantities(salesReturn),
      // Dentro de Ventas: el comprobante registra lo devuelto. El stock vuelve al almacén disponible.
      respond: (salesReturn) => {
        salesReturn.items.forEach((item) => {
          applyInventoryMovement({
            product_id: item.product_id,
            quantity: item.quantity,
            direction: "in",
            type: "return",
            reference: salesReturn.number,
          })
        })
        const invoice = invoices.store.find(salesReturn.invoice_id)
        if (invoice) {
          invoices.store.update(invoice.id, {
            items: invoice.items.map((item) => {
              const returned = salesReturn.items.find((candidate) => candidate.product_id === item.product_id)
              return returned ? { ...item, returned_quantity: item.returned_quantity + returned.quantity } : item
            }),
          })
        }
        return salesReturn
      },
    },
  ],
})

export const salesHandlers = [...quotes.handlers, ...orders.handlers, ...invoices.handlers, ...returns.handlers]

/** Comprobantes semilla, para que los mocks de Finanzas hablen de los mismos documentos */
export const salesInvoiceSeed = invoiceSeed
/** Comprobantes y devoluciones vigentes (incluye los creados en la sesión), para Finanzas y Reportes */
export const currentSalesInvoices = () => invoices.store.all()
export const currentSalesReturns = () => returns.store.all()
