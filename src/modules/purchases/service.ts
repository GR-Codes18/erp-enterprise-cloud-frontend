import { api } from "@/shared/lib/api/client"
import { toListQuery } from "@/shared/lib/api/query"
import type { PageParams, Paginated } from "@/shared/lib/api/types"
import type { SupplierInvoice, SupplierInvoiceInput } from "./invoices/schema"
import type { PurchaseOrder, PurchaseOrderInput } from "./orders/schema"
import type { Reception, ReceptionInput } from "./receptions/schema"
import type { PurchaseRequest, RequestInput } from "./requests/schema"
import type { PurchaseReturn, PurchaseReturnInput } from "./returns/schema"

const path = (base: string, id: string, action?: string) =>
  `${base}/${encodeURIComponent(id)}${action ? `/${action}` : ""}`

/** list, get, create, update y delete de un documento en borrador, más sus acciones de estado */
function documentService<T, I>(base: string) {
  return {
    list: (params: PageParams, signal?: AbortSignal) =>
      api.get<Paginated<T>>(base, { query: toListQuery(params), signal }),
    get: (id: string, signal?: AbortSignal) => api.get<T>(path(base, id), { signal }),
    create: (input: I) => api.post<T>(base, input),
    update: (id: string, input: I) => api.put<T>(path(base, id), input),
    remove: (id: string) => api.delete(path(base, id)),
    action: (id: string, action: string, body: object = {}) => api.post<T>(path(base, id, action), body),
  }
}

export type DocumentService<T, I> = ReturnType<typeof documentService<T, I>>

export const requestService = documentService<PurchaseRequest, RequestInput>("/purchases/requests")
export const purchaseOrderService = documentService<PurchaseOrder, PurchaseOrderInput>("/purchases/orders")
export const receptionService = documentService<Reception, ReceptionInput>("/purchases/receptions")
export const supplierInvoiceService = documentService<SupplierInvoice, SupplierInvoiceInput>("/purchases/invoices")
export const purchaseReturnService = documentService<PurchaseReturn, PurchaseReturnInput>("/purchases/returns")
