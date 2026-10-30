import { api } from "@/shared/lib/api/client"
import { toListQuery } from "@/shared/lib/api/query"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import type { Invoice, IssueInvoiceInput } from "./invoices/schema"
import type { DeliveryStatus, Order, OrderInput } from "./orders/schema"
import type { Quote, QuoteInput } from "./quotes/schema"
import type { ReturnInput, SalesReturn } from "./returns/schema"

const path = (base: string, id: string, action?: string) =>
  `${base}/${encodeURIComponent(id)}${action ? `/${action}` : ""}`

const QUOTES = "/sales/quotes"
const ORDERS = "/sales/orders"
const INVOICES = "/sales/invoices"
const RETURNS = "/sales/returns"

export const quoteService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Quote>>(QUOTES, { query: toListQuery(params), signal }),
  get: (id: string, signal?: AbortSignal) => api.get<Quote>(path(QUOTES, id), { signal }),
  create: (input: QuoteInput) => api.post<Quote>(QUOTES, input),
  update: (id: string, input: QuoteInput) => api.put<Quote>(path(QUOTES, id), input),
  remove: (id: string) => api.delete(path(QUOTES, id)),
  send: (id: string) => api.post<Quote>(path(QUOTES, id, "send"), {}),
  accept: (id: string) => api.post<Quote>(path(QUOTES, id, "accept"), {}),
  reject: (id: string, reason: string) => api.post<Quote>(path(QUOTES, id, "reject"), { reason }),
  /** Crea un pedido en borrador con los datos de la cotización aceptada */
  convert: (id: string) => api.post<Order>(path(QUOTES, id, "convert"), {}),
}

export const orderService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Order>>(ORDERS, { query: toListQuery(params), signal }),
  get: (id: string, signal?: AbortSignal) => api.get<Order>(path(ORDERS, id), { signal }),
  create: (input: OrderInput) => api.post<Order>(ORDERS, input),
  update: (id: string, input: OrderInput) => api.put<Order>(path(ORDERS, id), input),
  remove: (id: string) => api.delete(path(ORDERS, id)),
  /** El backend valida cliente activo, stock y límite de crédito (409 con el motivo) */
  confirm: (id: string) => api.post<Order>(path(ORDERS, id, "confirm"), {}),
  reserve: (id: string, expires_at: string) => api.post<Order>(path(ORDERS, id, "reserve"), { expires_at }),
  release: (id: string) => api.post<Order>(path(ORDERS, id, "release"), {}),
  cancel: (id: string, reason: string) => api.post<Order>(path(ORDERS, id, "cancel"), { reason }),
  updateDeliveryStatus: (id: string, status: DeliveryStatus) =>
    api.patch<Order>(path(ORDERS, id, "delivery-status"), { status }),
  /** Emite el comprobante del pedido confirmado: descuenta stock y, a crédito, crea la cuenta por cobrar */
  issueInvoice: (id: string, input: IssueInvoiceInput) => api.post<Invoice>(path(ORDERS, id, "invoice"), input),
}

export const invoiceService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<Invoice>>(INVOICES, { query: toListQuery(params), signal }),
  get: (id: string, signal?: AbortSignal) => api.get<Invoice>(path(INVOICES, id), { signal }),
  void: (id: string, reason: string) => api.post<Invoice>(path(INVOICES, id, "void"), { reason }),
}

export const returnService = {
  list: (params: PageParams, signal?: AbortSignal) =>
    api.get<Paginated<SalesReturn>>(RETURNS, { query: toListQuery(params), signal }),
  get: (id: string, signal?: AbortSignal) => api.get<SalesReturn>(path(RETURNS, id), { signal }),
  create: (input: ReturnInput) => api.post<SalesReturn>(RETURNS, input),
  update: (id: string, input: ReturnInput) => api.put<SalesReturn>(path(RETURNS, id), input),
  remove: (id: string) => api.delete(path(RETURNS, id)),
  confirm: (id: string) => api.post<SalesReturn>(path(RETURNS, id, "confirm"), {}),
}
