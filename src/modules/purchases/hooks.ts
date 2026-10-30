import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useListsByStatus } from "@/shared/hooks/useListsByStatus"
import type { PageParams } from "@/shared/lib/api/types"
import { toCents } from "@/shared/lib/money"
import type { SupplierInvoice, SupplierInvoiceInput } from "./invoices/schema"
import type { PurchaseOrder, PurchaseOrderInput, PurchaseOrderStatus } from "./orders/schema"
import type { Reception, ReceptionInput } from "./receptions/schema"
import type { PurchaseRequest, RequestInput } from "./requests/schema"
import type { PurchaseReturn, PurchaseReturnInput } from "./returns/schema"
import {
  type DocumentService,
  purchaseOrderService,
  purchaseReturnService,
  receptionService,
  requestService,
  supplierInvoiceService,
} from "./service"

/** Una recepción cambia la orden; una factura nace de la orden: se invalida todo Compras */
export const purchaseKeys = {
  all: ["purchases"] as const,
  list: (resource: string, params: PageParams) => [...purchaseKeys.all, resource, "list", params] as const,
  detail: (resource: string, id: string) => [...purchaseKeys.all, resource, "detail", id] as const,
}

/** Hooks de un documento de Compras: listado, detalle, CRUD de borrador y acciones de estado */
function documentHooks<T, I>(resource: string, service: DocumentService<T, I>) {
  const useInvalidate = () => {
    const queryClient = useQueryClient()
    return () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: purchaseKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["stock"] }),
        queryClient.invalidateQueries({ queryKey: ["kardex"] }),
        queryClient.invalidateQueries({ queryKey: ["finance"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ])
  }

  return {
    useList: (params: PageParams) =>
      useQuery({
        queryKey: purchaseKeys.list(resource, params),
        queryFn: ({ signal }) => service.list(params, signal),
        placeholderData: keepPreviousData,
      }),
    useDetail: (id: string) =>
      useQuery({
        queryKey: purchaseKeys.detail(resource, id),
        queryFn: ({ signal }) => service.get(id, signal),
        enabled: id !== "",
      }),
    useCreate: () => {
      const invalidate = useInvalidate()
      return useMutation({ mutationFn: (input: I) => service.create(input), onSuccess: invalidate })
    },
    useUpdate: () => {
      const invalidate = useInvalidate()
      return useMutation({
        mutationFn: ({ id, input }: { id: string; input: I }) => service.update(id, input),
        onSuccess: invalidate,
      })
    },
    useRemove: () => {
      const invalidate = useInvalidate()
      return useMutation({ mutationFn: (id: string) => service.remove(id), onSuccess: invalidate })
    },
    /** Acción de estado: POST /<recurso>/{id}/<acción> (con { reason } si la acción lo exige) */
    useAction: (action: string) => {
      const invalidate = useInvalidate()
      return useMutation({
        mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
          service.action(id, action, reason === undefined ? {} : { reason }),
        onSuccess: invalidate,
      })
    },
  }
}

export const requestHooks = documentHooks<PurchaseRequest, RequestInput>("requests", requestService)
export const purchaseOrderHooks = documentHooks<PurchaseOrder, PurchaseOrderInput>("orders", purchaseOrderService)
export const receptionHooks = documentHooks<Reception, ReceptionInput>("receptions", receptionService)
export const supplierInvoiceHooks = documentHooks<SupplierInvoice, SupplierInvoiceInput>("invoices", supplierInvoiceService)
export const purchaseReturnHooks = documentHooks<PurchaseReturn, PurchaseReturnInput>("returns", purchaseReturnService)

export interface SupplierInvoiceOption {
  id: string
  code: string
  supplier_id: string
  supplier_name: string
  balance: string
}

/** Facturas de proveedor con saldo por pagar, para el formulario de pago de Finanzas (regla 0.5) */
export function useSupplierInvoiceOptions() {
  const params: PageParams = { page: 1, size: 100, filters: { status: "registered" } }
  return useQuery({
    queryKey: purchaseKeys.list("invoice-options", params),
    queryFn: ({ signal }) => supplierInvoiceService.list(params, signal),
    select: (data): SupplierInvoiceOption[] =>
      data.items
        .filter((invoice) => toCents(invoice.balance) > 0)
        .map((invoice) => ({
          id: invoice.id,
          code: `${invoice.series}-${invoice.number}`,
          supplier_id: invoice.supplier_id,
          supplier_name: invoice.supplier_name,
          balance: invoice.balance,
        })),
  })
}

/** Órdenes en los estados pedidos (y de un proveedor, si se indica), filtradas en el servidor */
export const usePurchaseOrdersByStatus = (statuses: readonly PurchaseOrderStatus[], supplierId = "") =>
  useListsByStatus(
    [...purchaseKeys.all, "orders"],
    statuses,
    purchaseOrderService.list,
    supplierId ? { supplier_id: supplierId } : {},
  )
