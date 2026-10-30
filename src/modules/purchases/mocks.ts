import {
  PRODUCTS,
  USER_NAMES,
  productName,
  productRef,
  sessionUserId,
  supplierName,
  supplierRef,
  userRef,
  warehouseRef,
} from "@/mocks/refs"
import { createDocumentHandlers, nextNumber, totalsOf } from "@/mocks/utils/documents"
import { applyInventoryMovement } from "@/modules/inventory/state"
import { fromCents, toCents } from "@/shared/lib/money"
import { supplierInvoiceInputSchema, type SupplierInvoice, type SupplierInvoiceInput } from "./invoices/schema"
import { pendingQuantity, purchaseOrderInputSchema, type PurchaseOrder, type PurchaseOrderInput } from "./orders/schema"
import { receptionInputSchema, receptionQuantityErrors, type Reception, type ReceptionInput } from "./receptions/schema"
import { requestInputSchema, type PurchaseRequest, type RequestInput } from "./requests/schema"
import {
  purchaseReturnInputSchema,
  purchaseReturnQuantityErrors,
  type PurchaseReturn,
  type PurchaseReturnInput,
} from "./returns/schema"

/** UUID por recurso: solicitudes 8050, órdenes 8051, recepciones 8052, facturas 8053, devoluciones 8054 */
const uuid = (prefix: string, n: number) => `00000000-0000-4000-${prefix}-${String(n).padStart(12, "0")}`
const requestId = (n: number) => uuid("8050", n)
const orderId = (n: number) => uuid("8051", n)
const receptionId = (n: number) => uuid("8052", n)
const invoiceId = (n: number) => uuid("8053", n)
const returnId = (n: number) => uuid("8054", n)

const WAREHOUSE_NAMES: Record<string, string> = {
  [warehouseRef(1)]: "Almacén Central Principal",
  [warehouseRef(2)]: "Almacén de Materia Prima",
  [warehouseRef(3)]: "Almacén de Productos Terminados",
}
const warehouseName = (id: string) => WAREHOUSE_NAMES[id] ?? "Almacén registrado en esta sesión"
const userName = (id: string) => USER_NAMES[id] ?? "Usuario"
const costOf = (n: number) => PRODUCTS.find((p) => p.n === n)?.cost_price ?? "0.00"

// ---------------------------------------------------------------- Solicitudes

function makeRequest(n: number, input: RequestInput, status: PurchaseRequest["status"], requestedBy: string, extra: Partial<PurchaseRequest> = {}): PurchaseRequest {
  return {
    ...input,
    id: requestId(n),
    number: nextNumber("SOL", n),
    items: input.items.map((item) => ({ ...item, product_name: productName(item.product_id) })),
    status,
    requested_by: requestedBy,
    requested_by_name: userName(requestedBy),
    decided_by_name: "",
    rejection_reason: "",
    created_at: "2026-09-25T14:00:00Z",
    ...extra,
  }
}

const requestSeed: PurchaseRequest[] = [
  makeRequest(1, { items: [{ product_id: productRef(3), quantity: 100 }, { product_id: productRef(4), quantity: 1000 }], justification: "Obra del cliente Agroexport: cemento y ladrillo.", needed_by: "2026-09-30" }, "approved", userRef(9), { decided_by_name: "Gabriel Romero", created_at: "2026-09-18T14:00:00Z" }),
  makeRequest(2, { items: [{ product_id: productRef(9), quantity: 30 }], justification: "El cable está por debajo del stock mínimo.", needed_by: "2026-10-15" }, "pending", userRef(9), { created_at: "2026-10-06T14:00:00Z" }),
  // Creada por el administrador: él mismo no puede aprobarla (segregación de funciones)
  makeRequest(3, { items: [{ product_id: productRef(11), quantity: 10 }], justification: "Reflectores para el nuevo almacén de Ate.", needed_by: "2026-10-20" }, "pending", userRef(1), { created_at: "2026-10-07T14:00:00Z" }),
  makeRequest(4, { items: [{ product_id: productRef(7), quantity: 40 }], justification: "Reposición de pintura para temporada alta.", needed_by: "2026-10-25" }, "draft", userRef(9), { created_at: "2026-10-08T13:00:00Z" }),
  makeRequest(5, { items: [{ product_id: productRef(10), quantity: 200 }], justification: "Compra anticipada de candados por oferta.", needed_by: "2026-10-10" }, "rejected", userRef(8), { decided_by_name: "Gabriel Romero", rejection_reason: "Ya hay stock suficiente para el trimestre.", created_at: "2026-10-01T14:00:00Z" }),
]

// ---------------------------------------------------------------- Órdenes de compra

type OrderLine = { product_id: string; quantity: number; unit_price: string }
const orderLine = (productN: number, quantity: number): OrderLine => ({ product_id: productRef(productN), quantity, unit_price: costOf(productN) })

function makeOrder(n: number, input: PurchaseOrderInput, status: PurchaseOrder["status"], received: number[] = [], extra: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
    ...input,
    id: orderId(n),
    number: nextNumber("OC", n),
    supplier_name: supplierName(input.supplier_id),
    request_number: requestSeed.find((r) => r.id === input.request_id)?.number ?? "",
    items: input.items.map((item, index) => ({ ...item, product_name: productName(item.product_id), received_quantity: received[index] ?? 0 })),
    status,
    ...totalsOf(input.items),
    cancel_reason: "",
    created_at: "2026-09-20T15:00:00Z",
    ...extra,
  }
}

const orderSeed: PurchaseOrder[] = [
  makeOrder(1, { supplier_id: supplierRef(1), request_id: requestId(1), items: [orderLine(3, 100), orderLine(4, 1000)], expected_date: "2026-09-28", notes: "" }, "received", [100, 1000]),
  makeOrder(2, { supplier_id: supplierRef(2), request_id: "", items: [orderLine(5, 50), orderLine(6, 100)], expected_date: "2026-10-05", notes: "Entrega en dos partes." }, "partially_received", [50, 40], { created_at: "2026-09-28T15:00:00Z" }),
  makeOrder(3, { supplier_id: supplierRef(8), request_id: "", items: [orderLine(7, 30)], expected_date: "2026-10-12", notes: "" }, "issued", [], { created_at: "2026-10-03T15:00:00Z" }),
  makeOrder(4, { supplier_id: supplierRef(10), request_id: "", items: [orderLine(2, 20)], expected_date: "2026-10-20", notes: "" }, "draft", [], { created_at: "2026-10-07T15:00:00Z" }),
  makeOrder(5, { supplier_id: supplierRef(4), request_id: "", items: [orderLine(1, 15)], expected_date: "2026-10-01", notes: "" }, "cancelled", [], { cancel_reason: "El proveedor no tenía stock.", created_at: "2026-09-22T15:00:00Z" }),
]

// ---------------------------------------------------------------- Recepciones

function makeReception(n: number, input: ReceptionInput, status: Reception["status"], created_at: string, returned: number[] = []): Reception {
  const order = orderSeed.find((o) => o.id === input.order_id)
  return {
    ...input,
    id: receptionId(n),
    number: nextNumber("REC", n),
    order_number: order?.number ?? "",
    supplier_name: order?.supplier_name ?? "",
    warehouse_name: warehouseName(input.warehouse_id),
    items: input.items.map((item, index) => ({ ...item, product_name: productName(item.product_id), returned_quantity: returned[index] ?? 0 })),
    status,
    created_at,
  }
}

const receptionSeed: Reception[] = [
  makeReception(1, { order_id: orderId(1), warehouse_id: warehouseRef(2), guide_number: "T001-004521", items: [{ product_id: productRef(3), quantity: 100 }, { product_id: productRef(4), quantity: 1000 }] }, "confirmed", "2026-09-27T16:00:00Z", [0, 20]),
  makeReception(2, { order_id: orderId(2), warehouse_id: warehouseRef(1), guide_number: "EG07-000877", items: [{ product_id: productRef(5), quantity: 50 }, { product_id: productRef(6), quantity: 40 }] }, "confirmed", "2026-10-04T16:00:00Z"),
  makeReception(3, { order_id: orderId(2), warehouse_id: warehouseRef(1), guide_number: "EG07-000901", items: [{ product_id: productRef(6), quantity: 30 }] }, "draft", "2026-10-08T15:00:00Z"),
]

// ---------------------------------------------------------------- Facturas del proveedor

/** Valor de lo recibido de la orden (con IGV): con eso el backend compara el total de la factura */
const receivedTotal = (order: PurchaseOrder) =>
  totalsOf(order.items.map((item) => ({ quantity: item.received_quantity, unit_price: item.unit_price }))).total

const totalWarning = (total: string, received: string) =>
  toCents(total) === toCents(received)
    ? ""
    : `El total de la factura no coincide con lo recibido (${received}). Revísalo con el proveedor antes de pagar.`

function makeInvoice(n: number, input: SupplierInvoiceInput, paid: string, status: SupplierInvoice["status"], extra: Partial<SupplierInvoice> = {}): SupplierInvoice {
  const order = orderSeed.find((o) => o.id === input.order_id)
  const received = order ? receivedTotal(order) : "0.00"
  return {
    ...input,
    id: invoiceId(n),
    supplier_name: supplierName(input.supplier_id),
    order_number: order?.number ?? "",
    received_total: received,
    warning: totalWarning(input.total, received),
    paid,
    balance: fromCents(toCents(input.total) - toCents(paid)),
    status,
    void_reason: "",
    created_at: `${input.issue_date}T17:00:00Z`,
    ...extra,
  }
}

const invoiceSeed: SupplierInvoice[] = [
  makeInvoice(1, { supplier_id: supplierRef(1), order_id: orderId(1), series: "F001", number: "00004521", issue_date: "2026-09-27", due_date: "2026-10-27", total: "4248.00" }, "4248.00", "paid"),
  // El proveedor facturó más de lo recibido: el backend avisa
  makeInvoice(2, { supplier_id: supplierRef(2), order_id: orderId(2), series: "F002", number: "00000877", issue_date: "2026-10-04", due_date: "2026-12-03", total: "1500.00" }, "0.00", "registered"),
  makeInvoice(3, { supplier_id: supplierRef(2), order_id: orderId(2), series: "F002", number: "00000870", issue_date: "2026-10-04", due_date: "2026-12-03", total: "1262.60" }, "0.00", "void", { void_reason: "Factura duplicada por el proveedor." }),
]

// ---------------------------------------------------------------- Devoluciones al proveedor

function buildReturn(id: string, number: string, input: PurchaseReturnInput, status: PurchaseReturn["status"], created_at: string, reception: Reception | undefined, order: PurchaseOrder | undefined): PurchaseReturn {
  const items = input.items.map((item) => ({
    ...item,
    product_name: productName(item.product_id),
    unit_price: order?.items.find((line) => line.product_id === item.product_id)?.unit_price ?? "0.00",
  }))
  return {
    id,
    number,
    reception_id: input.reception_id,
    reception_number: reception?.number ?? "",
    supplier_name: reception?.supplier_name ?? "",
    items,
    reason: input.reason,
    status,
    total: totalsOf(items).total,
    created_at,
  }
}

const returnSeed: PurchaseReturn[] = [
  buildReturn(returnId(1), nextNumber("DVP", 1), { reception_id: receptionId(1), items: [{ product_id: productRef(4), quantity: 20 }], reason: "Ladrillos rotos en la descarga." }, "confirmed", "2026-09-28T15:00:00Z", receptionSeed[0], orderSeed[0]),
]

// ---------------------------------------------------------------- Handlers

const counters = { request: requestSeed.length, order: orderSeed.length, reception: receptionSeed.length, ret: returnSeed.length }

const requests = createDocumentHandlers<PurchaseRequest, RequestInput, PurchaseRequest["status"]>({
  resource: "purchases/requests",
  seed: requestSeed,
  searchFields: ["number", "justification", "requested_by_name"],
  filterFields: ["status"],
  dateField: "created_at",
  inputSchema: requestInputSchema,
  createRecord: (input, id, created_at, _items, request) => {
    counters.request += 1
    const user = sessionUserId(request) || userRef(1)
    return { ...makeRequest(counters.request, input, "draft", user), id, created_at }
  },
  updateRecord: (current, input) => ({ ...current, ...input, items: input.items.map((item) => ({ ...item, product_name: productName(item.product_id) })) }),
  actions: [
    { action: "submit", from: ["draft"], to: "pending" },
    ...(["approve", "reject"] as const).map((action) => ({
      action,
      from: ["pending" as const],
      to: action === "approve" ? ("approved" as const) : ("rejected" as const),
      requiresReason: action === "reject",
      // Segregación de funciones: quien solicita no decide
      check: (current: PurchaseRequest, _body: Record<string, unknown>, request: Request) =>
        current.requested_by === sessionUserId(request)
          ? { status: 409, code: "SELF_APPROVAL", message: "No puedes aprobar ni rechazar tu propia solicitud." }
          : undefined,
      apply: (_current: PurchaseRequest, body: Record<string, unknown>) => ({
        decided_by_name: "Usuario en sesión",
        rejection_reason: action === "reject" ? String(body.reason).trim() : "",
      }),
    })),
  ],
})

const orders = createDocumentHandlers<PurchaseOrder, PurchaseOrderInput, PurchaseOrder["status"]>({
  resource: "purchases/orders",
  seed: orderSeed,
  searchFields: ["number", "supplier_name"],
  filterFields: ["status", "supplier_id"],
  dateField: "created_at",
  inputSchema: purchaseOrderInputSchema,
  createRecord: (input, id, created_at) => {
    counters.order += 1
    return { ...makeOrder(counters.order, input, "draft"), id, created_at, request_number: requests.store.find(input.request_id)?.number ?? "" }
  },
  updateRecord: (current, input) => ({ ...makeOrder(0, input, "draft"), id: current.id, number: current.number, created_at: current.created_at }),
  actions: [
    { action: "issue", from: ["draft"], to: "issued" },
    {
      action: "cancel",
      from: ["draft", "issued"],
      to: "cancelled",
      requiresReason: true,
      check: (order) =>
        order.items.some((item) => item.received_quantity > 0)
          ? { status: 409, code: "HAS_RECEPTIONS", message: "La orden ya tiene recepciones: no se puede cancelar." }
          : undefined,
      apply: (_o, body) => ({ cancel_reason: String(body.reason).trim() }),
    },
  ],
})

function checkReception(input: ReceptionInput) {
  const order = orders.store.find(input.order_id)
  if (!order || (order.status !== "issued" && order.status !== "partially_received")) {
    return { status: 422, code: "VALIDATION_ERROR", message: "Elige una orden emitida con productos pendientes." }
  }
  const errors = receptionQuantityErrors(input.items, order.items).flatMap((message, index) =>
    message ? [{ field: `items.${index}.quantity`, message }] : [],
  )
  return errors.length > 0 ? { status: 422, code: "VALIDATION_ERROR", message: "Revisa las cantidades recibidas.", errors } : undefined
}

const receptions = createDocumentHandlers<Reception, ReceptionInput, Reception["status"]>({
  resource: "purchases/receptions",
  seed: receptionSeed,
  searchFields: ["number", "order_number", "supplier_name", "guide_number"],
  filterFields: ["status", "order_id", "warehouse_id"],
  dateField: "created_at",
  inputSchema: receptionInputSchema,
  createRecord: (input, id, created_at) => {
    const rejected = checkReception(input)
    if (rejected) return rejected
    counters.reception += 1
    const order = orders.store.find(input.order_id)
    return {
      ...makeReception(counters.reception, input, "draft", created_at),
      id,
      order_number: order?.number ?? "",
      supplier_name: order?.supplier_name ?? "",
    }
  },
  updateRecord: (current, input) =>
    checkReception(input) ?? { ...makeReception(0, input, "draft", current.created_at), id: current.id, number: current.number, order_number: current.order_number, supplier_name: current.supplier_name },
  actions: [
    {
      action: "confirm",
      from: ["draft"],
      to: "confirmed",
      check: (reception) => checkReception(reception),
      // Dentro de Compras: la orden registra lo recibido y el inventario suma el material recibido.
      respond: (reception) => {
        reception.items.forEach((item) => {
          applyInventoryMovement({
            product_id: item.product_id,
            warehouse_id: reception.warehouse_id,
            quantity: item.quantity,
            direction: "in",
            type: "purchase",
            reference: reception.number,
          })
        })
        const order = orders.store.find(reception.order_id)
        if (order) {
          const items = order.items.map((item) => {
            const received = reception.items.find((line) => line.product_id === item.product_id)
            return received ? { ...item, received_quantity: item.received_quantity + received.quantity } : item
          })
          const complete = items.every((item) => pendingQuantity(item) === 0)
          orders.store.update(order.id, { items, status: complete ? "received" : "partially_received" })
        }
        return reception
      },
    },
  ],
})

const invoices = createDocumentHandlers<SupplierInvoice, SupplierInvoiceInput, SupplierInvoice["status"]>({
  resource: "purchases/invoices",
  seed: invoiceSeed,
  searchFields: ["series", "number", "supplier_name", "order_number"],
  filterFields: ["status", "supplier_id"],
  dateField: "issue_date",
  editableStatus: "registered",
  // Regla 3.3: una factura registrada tiene historia: se anula, nunca se borra
  allowDelete: false,
  inputSchema: supplierInvoiceInputSchema,
  createRecord: (input, id, created_at, items) => {
    const duplicate = items.some(
      (invoice) => invoice.supplier_id === input.supplier_id && invoice.series === input.series && Number(invoice.number) === Number(input.number),
    )
    if (duplicate) {
      const message = "Ya registraste esta factura del proveedor (misma serie y número)"
      return { status: 409, code: "DUPLICATE", message, errors: [{ field: "number", message }] }
    }
    const order = orders.store.find(input.order_id)
    if (!order || order.supplier_id !== input.supplier_id) {
      return { status: 422, code: "VALIDATION_ERROR", message: "La orden no pertenece a ese proveedor." }
    }
    const received = receivedTotal(order)
    return {
      ...input,
      number: input.number.padStart(8, "0"),
      id,
      supplier_name: supplierName(input.supplier_id),
      order_number: order.number,
      received_total: received,
      warning: totalWarning(input.total, received),
      paid: "0.00",
      balance: input.total,
      status: "registered",
      void_reason: "",
      created_at,
    }
  },
  // Una factura registrada no se edita: si tiene un error, se anula y se registra de nuevo
  updateRecord: () => ({ status: 409, code: "INVALID_TRANSITION", message: "Una factura registrada no se edita: anúlala y regístrala de nuevo." }),
  actions: [
    {
      action: "void",
      from: ["registered"],
      to: "void",
      requiresReason: true,
      check: (invoice) =>
        toCents(invoice.paid) > 0 ? { status: 409, code: "HAS_PAYMENTS", message: "La factura tiene pagos: no se puede anular." } : undefined,
      apply: (_i, body) => ({ void_reason: String(body.reason).trim() }),
    },
  ],
})

export function applySupplierInvoicePayment(invoiceId: string, deltaCents: number) {
  const invoice = invoices.store.find(invoiceId)
  if (!invoice || invoice.status === "void") return
  const paid = Math.max(0, Math.min(toCents(invoice.total), toCents(invoice.paid) + deltaCents))
  const balance = toCents(invoice.total) - paid
  invoices.store.update(invoice.id, {
    paid: fromCents(paid),
    balance: fromCents(balance),
    status: balance === 0 ? "paid" : "registered",
  })
}

function checkReturn(input: PurchaseReturnInput) {
  const reception = receptions.store.find(input.reception_id)
  if (!reception || reception.status !== "confirmed") {
    return { status: 422, code: "VALIDATION_ERROR", message: "Elige una recepción confirmada." }
  }
  const errors = purchaseReturnQuantityErrors(input.items, reception.items).flatMap((message, index) =>
    message ? [{ field: `items.${index}.quantity`, message }] : [],
  )
  return errors.length > 0 ? { status: 422, code: "VALIDATION_ERROR", message: "Revisa las cantidades a devolver.", errors } : undefined
}

const purchaseReturns = createDocumentHandlers<PurchaseReturn, PurchaseReturnInput, PurchaseReturn["status"]>({
  resource: "purchases/returns",
  seed: returnSeed,
  searchFields: ["number", "reception_number", "supplier_name"],
  filterFields: ["status", "reception_id"],
  dateField: "created_at",
  inputSchema: purchaseReturnInputSchema,
  createRecord: (input, id, created_at) => {
    const rejected = checkReturn(input)
    if (rejected) return rejected
    counters.ret += 1
    const reception = receptions.store.find(input.reception_id)
    return buildReturn(id, nextNumber("DVP", counters.ret), input, "draft", created_at, reception, orders.store.find(reception?.order_id ?? ""))
  },
  updateRecord: (current, input) => {
    const reception = receptions.store.find(input.reception_id)
    return checkReturn(input) ?? buildReturn(current.id, current.number, input, "draft", current.created_at, reception, orders.store.find(reception?.order_id ?? ""))
  },
  actions: [
    {
      action: "confirm",
      from: ["draft"],
      to: "confirmed",
      check: (purchaseReturn) => checkReturn(purchaseReturn),
      // Dentro de Compras: la recepción registra lo devuelto y el stock vuelve a bajar.
      respond: (purchaseReturn) => {
        const reception = receptions.store.find(purchaseReturn.reception_id)
        purchaseReturn.items.forEach((item) => {
          applyInventoryMovement({
            product_id: item.product_id,
            warehouse_id: reception?.warehouse_id,
            quantity: item.quantity,
            direction: "out",
            type: "return",
            reference: purchaseReturn.number,
          })
        })
        if (reception) {
          receptions.store.update(reception.id, {
            items: reception.items.map((item) => {
              const returned = purchaseReturn.items.find((line) => line.product_id === item.product_id)
              return returned ? { ...item, returned_quantity: item.returned_quantity + returned.quantity } : item
            }),
          })
        }
        return purchaseReturn
      },
    },
  ],
})

export const purchaseHandlers = [
  ...requests.handlers,
  ...orders.handlers,
  ...receptions.handlers,
  ...invoices.handlers,
  ...purchaseReturns.handlers,
]

/** Facturas semilla, para que los mocks de Finanzas hablen de las mismas cuentas por pagar */
export const supplierInvoiceSeed = invoiceSeed
/** Facturas vigentes (incluye las registradas en la sesión), para Finanzas */
export const currentSupplierInvoices = () => invoices.store.all()
/** Órdenes de compra en memoria para las alertas del dashboard simulado */
export const currentPurchaseOrders = () => orders.store.all()
